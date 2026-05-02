const KEY = "remonLemons";
const MAX_DAILY = 3;

const today = () => new Date().toISOString().slice(0, 10);

const getStoredData = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};

export const getLemonCount = () => {
  const data = getStoredData();
  if (!data || data.date !== today()) {
    return MAX_DAILY;
  }
  return Math.max(0, data.count);
};

export const consumeLemon = () => {
  const current = getLemonCount();
  const newCount = Math.max(0, current - 1);
  localStorage.setItem(KEY, JSON.stringify({ date: today(), count: newCount }));
  return newCount;
};
