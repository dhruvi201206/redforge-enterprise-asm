// Fully Offline In-Memory Database Entry Point
// Removed PostgreSQL and Drizzle ORM dependencies

export const db = {
  // Offline mock database placeholder
  query: {}
};

export const createPool = () => {
  return {
    on: () => {},
    end: async () => {},
  };
};

export type DBType = typeof db;
