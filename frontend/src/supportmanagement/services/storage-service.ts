const storage: {
  getItem: (key: string) => any;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} =
  typeof window !== 'undefined'
    ? window.localStorage
    : {
        getItem: (key: string) => undefined,
        setItem: (key: string, value: string) => undefined,
        removeItem: (key: string) => undefined,
      };

const get: (key: string) => string = (key) => {
  return (
    (storage.getItem(`${process.env.NEXT_PUBLIC_APPLICATION}${key}`) &&
      JSON.parse(storage.getItem(`${process.env.NEXT_PUBLIC_APPLICATION}${key}`))) ||
    undefined
  );
};

const set: (key: string, value: number | string | undefined | null) => void = (key, value) => {
  storage.setItem(`${process.env.NEXT_PUBLIC_APPLICATION}${key}`, JSON.stringify(value));
};

const store = {
  get,
  set,
};

export default store;
