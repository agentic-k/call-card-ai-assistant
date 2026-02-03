/**
 * Text classification module for transcript analysis
 *
 * This module provides functions to classify text from meeting transcripts
 * and identify important segments, topics, and sentiment using semantic similarity.
 */
import { pipeline, env } from '@xenova/transformers';

// ---------- Configuration ----------
const MODEL_EMB = 'Xenova/all-MiniLM-L6-v2';

// Temporal smoothing for classification
const EMA_ALPHA = 0.45;
const WINDOW_KEEP = 12;

// Short-chunk guards
const MIN_CHARS_FOR_CONFIDENT = 8;
const SHORT_CHUNK_PENALTY = 0.97;

// Single-label policy
const MIN_CONFIDENCE_THRESHOLD = 0.62;

// Hysteresis for topic "stickiness"
const HYSTERESIS_SWITCH_FACTOR = 1.10; // New topic must be 10% stronger to switch.
const HYSTERESIS_DEACTIVATION_THRESHOLD = MIN_CONFIDENCE_THRESHOLD - 0.05; // Score drop-off point.

// ---------- State Management ----------
// Cache for model and embeddings
let embeddingModel = null;
const labelEmbeddings = new Map();

// State for smoothing
const emaScores = new Map();

// State for Hysteresis
let activeTopicState = { label: null, score: 0 };

// ---------- Helper Functions ----------
/**
 * Calculates cosine similarity between two vectors
 * @param {Array<number>} a - First vector
 * @param {Array<number>} b - Second vector
 * @returns {number} Cosine similarity (-1 to 1)
 */
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

/**
 * Applies a penalty to scores for short text chunks
 * @param {number} score - Original score
 * @param {string} text - Text being classified
 * @returns {number} Adjusted score
 */
function penalizeShort(score, text) {
  return text.length < MIN_CHARS_FOR_CONFIDENT ? score * SHORT_CHUNK_PENALTY : score;
}

/**
 * Gets or initializes EMA state for a label
 * @param {string} label - Classification label
 * @returns {object} Label state object
 */
function getLabelState(label) {
  if (!emaScores.has(label)) emaScores.set(label, { ema: 0, history: [] });
  return emaScores.get(label);
}

/**
 * Updates the exponential moving average for a label
 * @param {string} label - Classification label
 * @param {number} score - Current score
 */
function updateEMA(label, score) {
  const st = getLabelState(label);
  st.ema = EMA_ALPHA * score + (1 - EMA_ALPHA) * st.ema;
  st.history.push(score);
  if (st.history.length > WINDOW_KEEP) st.history.shift();
}

/**
 * Loads the embedding model if not already loaded
 * @returns {Promise<Object>} The embedding model pipeline
 */
async function getEmbeddingModel() {
  if (!embeddingModel) {
    try {
      embeddingModel = await pipeline('feature-extraction', MODEL_EMB, {
        device: 'wasm',
        quantized: false,
      });
    } catch (error) {
      console.error('[TextClassifier] Error loading embedding model:', error);
      throw new Error('Failed to load embedding model');
    }
  }
  return embeddingModel;
}

/**
 * Precomputes embeddings for topic descriptions
 * @param {Array<Object>} topics - Array of topic objects with label and description
 * @returns {Promise<void>}
 */
async function precomputeTopicEmbeddings(topics) {
  const embedder = await getEmbeddingModel();

  for (const topic of topics) {
    if (!topic.description) {
      console.warn(`[TextClassifier] Missing description for topic: ${topic.label}`);
      continue;
    }

    try {
      const emb = await embedder(topic.description, { pooling: 'mean', normalize: true });
      labelEmbeddings.set(topic.label, emb.data);
    } catch (error) {
      console.error(`[TextClassifier] Error computing embedding for topic ${topic.label}:`, error);
    }
  }
}

// ---------- Classification Functions ----------
/**
 * Classifies text using semantic similarity and hysteresis logic for stability.
 *
 * @param {string} text - Text content to classify
 * @param {Array<{id: string, label: string, description: string}>} [topics] - Topics to classify against
 * @returns {Promise<object>} Classification result with a stable label and scores
 */
export async function classify(text, topics = null) {
  try {
    // Basic validation
    if (!text || typeof text !== 'string' || !text.trim() || text.length < MIN_CHARS_FOR_CONFIDENT) {
        // Even on empty text, return the current state
        return {
            label: activeTopicState.label || 'none',
            score: activeTopicState.score,
            topCandidates: [], // No candidates for empty text
        };
    }

    // If no topics provided or empty array, use default topics
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      topics = DEFAULT_TOPICS;
    }

    // Precompute topic embeddings if needed
    if (labelEmbeddings.size === 0) {
      await precomputeTopicEmbeddings(topics);
    }

    // Get the embedding model
    const embedder = await getEmbeddingModel();

    // Calculate text embedding
    const textEmbRaw = await embedder(text, { pooling: 'mean', normalize: true });
    const textEmb = textEmbRaw.data;

    // Calculate semantic scores for all topics
    const results = topics.map(topic => {
      if (!labelEmbeddings.has(topic.label)) {
        return { label: topic.label, score: 0 };
      }
      let score = (1 + cosineSim(textEmb, labelEmbeddings.get(topic.label))) / 2;
      score = penalizeShort(score, text);
      return { label: topic.label, score };
    });

    results.sort((a, b) => b.score - a.score);
    
    // ⭐ --- New: Get top 3 candidates and format as percentage ---
    const topCandidates = results.slice(0, 3).map(res => ({
      label: res.label,
      percentage: Math.round(res.score * 100),
    }));

    // Hysteresis Logic for the stable topic (remains unchanged)
    const topResult = results[0];
    const activeTopicCurrentResult = activeTopicState.label
      ? results.find(r => r.label === activeTopicState.label)
      : null;
    const activeTopicCurrentScore = activeTopicCurrentResult ? activeTopicCurrentResult.score : 0;

    if (!activeTopicState.label) {
      if (topResult.score >= MIN_CONFIDENCE_THRESHOLD) {
        activeTopicState.label = topResult.label;
        activeTopicState.score = topResult.score;
      }
    } else {
      if (
        topResult.label !== activeTopicState.label &&
        topResult.score > activeTopicCurrentScore * HYSTERESIS_SWITCH_FACTOR
      ) {
        activeTopicState.label = topResult.label;
        activeTopicState.score = topResult.score;
      } else if (activeTopicCurrentScore < HYSTERESIS_DEACTIVATION_THRESHOLD) {
        activeTopicState.label = null;
        activeTopicState.score = 0;
      } else {
        activeTopicState.score = activeTopicCurrentScore;
      }
    }

    // Update EMA state based on the STABLE active topic
    for (const res of results) {
      const scoreForEma = (res.label === activeTopicState.label) ? activeTopicState.score : 0.0;
      updateEMA(res.label, scoreForEma);
    }

    // Return the stable result along with the top candidates
    const st = activeTopicState.label ? getLabelState(activeTopicState.label) : { ema: 0, history: [] };
    
    return {
        label: activeTopicState.label || 'none',
        score: activeTopicState.score,
        ema: st.ema,
        matches: st.history.filter(s => s > 0).length,
        topCandidates: topCandidates, // ⭐ Add the new field to the result
    };
    
  } catch (error) {
    console.error('[TextClassifier] Classification error:', error);
    return {
      label: 'error',
      score: 0,
      ema: 0,
      error: error.message,
      topCandidates: [],
    };
  }
}

/**
 * Default topics to use when none are provided
 */
const DEFAULT_TOPICS = [
  // ... your topics remain here ...
];


/**
 * Classifies text and returns labeled results
 * @param {object} request - The classification request
 * @param {string} request.id - Unique identifier for the request
 * @param {string} request.text - Text content to classify
 * @param {Array} [request.topics] - Optional array of topics with descriptions to match
 * @returns {object} Classification result with labels and scores
 */
export async function classifyText(request) {
  try {
    if (!request || !request.text) {
      throw new Error('Invalid request: missing text');
    }

    const result = await classify(request.text, request.topics);

    // ⭐ Build the response, including the new topCandidates field
    const response = {
      id: request.id,
      label: result.label, // The stable, overall topic
      score: result.score,
      ema: result.ema,
      matches: result.matches,
      topCandidates: result.topCandidates, // The top 3 for the latest chunk
      timestamp: Date.now()
    };
    
    if (result.error) response.error = result.error;

    return response;
  } catch (error) {
    console.error('[TextClassifier] Classification error:', error);
    return {
      id: request.id,
      label: 'error',
      score: 0,
      error: error.message,
      topCandidates: [],
    };
  }
}

export default {
  classifyText,
  classify,
  DEFAULT_TOPICS
};