
// Utility for working with localStorage

// Helper to safely parse JSON from localStorage
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : defaultValue;
  } catch (error) {
    console.error(`Error retrieving ${key} from localStorage:`, error);
    return defaultValue;
  }
}

// Helper to safely store JSON in localStorage
export function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error storing ${key} in localStorage:`, error);
  }
}
