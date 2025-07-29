import { Court } from '@/types';

class Store {
  private static instance: Store;
  private lastScrapedData: Court[] | null = null;
  private lastScrapedTime: Date | null = null;

  private constructor() {}

  static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store();
    }
    return Store.instance;
  }

  setScrapedData(data: Court[]) {
    this.lastScrapedData = data;
    this.lastScrapedTime = new Date();
  }

  getLastScrapedData(): { data: Court[] | null; timestamp: Date | null } {
    return {
      data: this.lastScrapedData,
      timestamp: this.lastScrapedTime
    };
  }
}

export const store = Store.getInstance(); 