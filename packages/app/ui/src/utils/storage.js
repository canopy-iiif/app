const STORAGE_PREFIX = 'canopy_';

function canUseStorage(storage) {
  if (!storage) return false;
  try {
    const testKey = `${STORAGE_PREFIX}__test__`;
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    return canUseStorage(storage) ? storage : null;
  } catch (error) {
    return null;
  }
}

function prefixKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

export function getStorageItem(key, defaultValue = null) {
  if (!key) return defaultValue;
  const storage = getStorage();
  if (!storage) return defaultValue;
  try {
    const value = storage.getItem(prefixKey(key));
    return value === null ? defaultValue : value;
  } catch (error) {
    return defaultValue;
  }
}

export function setStorageItem(key, value) {
  if (!key) return false;
  const storage = getStorage();
  if (!storage) return false;
  try {
    if (value === undefined || value === null) {
      storage.removeItem(prefixKey(key));
    } else {
      storage.setItem(prefixKey(key), String(value));
    }
    return true;
  } catch (error) {
    return false;
  }
}

export function removeStorageItem(key) {
  if (!key) return false;
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.removeItem(prefixKey(key));
    return true;
  } catch (error) {
    return false;
  }
}
