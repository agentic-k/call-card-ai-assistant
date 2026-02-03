import { useState, useCallback } from 'react';
import { useChecklistStore } from '@/store/checklistStore';

interface Question {
  id: string;
  text: string;
}

interface CompletedQuestion extends Question {
  status: 'asked' | 'skipped';
}

export const useQuestionCompletion = () => {
  const toggleItemInStore = useChecklistStore((state) => state.toggleItem);
  const markItemsCompleteInStore = useChecklistStore((state) => state.markItemsComplete);

  const [completedQuestions, setCompletedQuestions] = useState<CompletedQuestion[]>([]);
  const [animatingQuestions, setAnimatingQuestions] = useState<Set<string>>(new Set());
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set());

  const updateAnimatingQuestions = useCallback((id: string, isAnimating: boolean) => {
    setAnimatingQuestions(prev => {
      const newSet = new Set(prev);
      if (isAnimating) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const updateRecentlyCompleted = useCallback((id: string, isRecent: boolean) => {
    setRecentlyCompleted(prev => {
      const newSet = new Set(prev);
      if (isRecent) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const completeQuestion = useCallback((question: Question, status: 'asked' | 'skipped') => {
    updateAnimatingQuestions(question.id, true);

    setTimeout(() => {
      updateRecentlyCompleted(question.id, true);
      toggleItemInStore(question.id);
      setCompletedQuestions(prev => [...prev, { ...question, status }]);
      updateAnimatingQuestions(question.id, false);
    }, 1100);

    setTimeout(() => {
      updateRecentlyCompleted(question.id, false);
    }, 2000);
  }, [toggleItemInStore, updateAnimatingQuestions, updateRecentlyCompleted]);

  const autoCompleteQuestions = useCallback((questions: Question[]) => {
    const questionIds = questions.map(q => q.id);
    markItemsCompleteInStore(questionIds);

    questions.forEach(question => {
        updateAnimatingQuestions(question.id, true);
        
        setTimeout(() => {
          updateRecentlyCompleted(question.id, true);
          setCompletedQuestions(prev => [...prev, { ...question, status: 'asked' }]);
          updateAnimatingQuestions(question.id, false);
        }, 1100);

        setTimeout(() => {
          updateRecentlyCompleted(question.id, false);
        }, 2000);
    });
  }, [markItemsCompleteInStore, updateAnimatingQuestions, updateRecentlyCompleted]);
  
  const resetQuestionCompletion = useCallback(() => {
    setCompletedQuestions([]);
    setAnimatingQuestions(new Set());
    setRecentlyCompleted(new Set());
  }, []);

  return {
    completedQuestions,
    animatingQuestions,
    recentlyCompleted,
    completeQuestion,
    autoCompleteQuestions,
    resetQuestionCompletion,
  };
}; 