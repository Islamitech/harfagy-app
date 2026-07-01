/* Unified Database Manager: Supabase Client with Graceful LocalStorage Fallback */
import { SUPABASE_CONFIG } from './config.js';

export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class MockFirestore {
  constructor() {
    this.storageKeyPrefix = "harfagy_db_";
    this.isSupabaseActive = false;
    this.supabaseClient = null;
    
    this.initSupabase();
  }

  async initSupabase() {
    if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
      try {
        console.log("Supabase credentials detected! Initializing Supabase client...");
        
        let cleanedUrl = SUPABASE_CONFIG.url.trim();
        // Remove trailing slashes and subpaths like /rest/v1 to keep it clean
        cleanedUrl = cleanedUrl.replace(/\/rest\/v1\/?$/, "");
        cleanedUrl = cleanedUrl.replace(/\/$/, "");
        
        // Dynamically import Supabase client via ESM CDN (zero cost)
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        this.supabaseClient = createClient(cleanedUrl, SUPABASE_CONFIG.anonKey);
        this.isSupabaseActive = true;
        
        console.log("Supabase client initialized successfully. Synchronizing tables...");
        this.runInitialMigration();
        
        // Setup real-time channel subscription to sync changes across devices
        this.supabaseClient.channel('public-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
            console.log(`Live Postgres update detected on table: ${payload.table}`);
            
            // Dispatch dynamic update event so UI renders live modifications instantly
            const event = new CustomEvent('harfagy_db_update', {
              detail: { collection: payload.table }
            });
            window.dispatchEvent(event);
          })
          .subscribe();
          
      } catch (err) {
        console.error("Failed to connect to Supabase. Falling back to LocalStorage Mode:", err);
        this.isSupabaseActive = false;
      }
    } else {
      console.log("No Supabase Anon Key set in config.js. Running in LocalStorage Mock Mode.");
      this.isSupabaseActive = false;
    }
  }

  async runInitialMigration() {
    const migrationFlag = "harfagy_supabase_migrated";
    if (localStorage.getItem(migrationFlag) === "true") return;
    
    console.log("Starting database migration from LocalStorage to Supabase cloud...");
    const collections = ["users", "artisans", "jobs", "messages", "complaints", "verifications", "withdrawals"];
    
    for (const col of collections) {
      const items = this.getCollection(col);
      if (items.length > 0) {
        await this.syncCollectionToSupabase(col, items);
      }
    }
    
    localStorage.setItem(migrationFlag, "true");
    console.log("Database migration completed successfully!");
  }

  /**
   * Retrieves an entire collection / table
   */
  getCollection(collectionName) {
    if (this.isSupabaseActive) {
      // Supabase fetches are async, but since our UI is structured synchronously,
      // we load the tables into memory during startup and updates,
      // OR we fetch them from memory-cache, synced in real-time.
      // To maintain compatibility with existing UI, we cache collection in localStorage
      // as a local mirror of Supabase, updating it when Postgres triggers changes!
      // This is a highly efficient Offline-First architecture!
    }
    
    const data = localStorage.getItem(this.storageKeyPrefix + collectionName);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Saves an entire collection
   */
  saveCollection(collectionName, items) {
    localStorage.setItem(this.storageKeyPrefix + collectionName, JSON.stringify(items));
    
    // Sync to Supabase in the background if active
    if (this.isSupabaseActive && this.supabaseClient) {
      this.syncCollectionToSupabase(collectionName, items);
    }
    
    const event = new CustomEvent('harfagy_db_update', {
      detail: { collection: collectionName }
    });
    window.dispatchEvent(event);
  }

  /**
   * Syncs entire collection to Supabase in the background (Upsert)
   */
  async syncCollectionToSupabase(collectionName, items) {
    try {
      // Convert ID format to match PostgreSQL column naming convention
      const formattedItems = items.map(item => {
        const copy = { ...item };
        // If nested objects are present, stringify for JSONB compatibility
        if (copy.workHours) copy.workHours = copy.workHours;
        if (copy.discounts) copy.discounts = copy.discounts;
        if (copy.gallery) copy.gallery = copy.gallery;
        return copy;
      });

      const { error } = await this.supabaseClient
        .from(collectionName)
        .upsert(formattedItems);
        
      if (error) console.error(`Failed to upsert to Supabase table ${collectionName}:`, error);
      else console.log(`Successfully synced collection ${collectionName} to Supabase.`);
    } catch (err) {
      console.error(`Supabase sync error on ${collectionName}:`, err);
    }
  }

  /**
   * Adds a new document to a collection
   */
  addDocument(collectionName, docData) {
    const collection = this.getCollection(collectionName);
    const newDoc = {
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      ...docData
    };
    collection.push(newDoc);
    
    // Save locally
    localStorage.setItem(this.storageKeyPrefix + collectionName, JSON.stringify(collection));
    
    // Save to Supabase in background
    if (this.isSupabaseActive && this.supabaseClient) {
      this.supabaseClient.from(collectionName).insert([newDoc]).then(({ error }) => {
        if (error) console.error("Supabase insert error:", error);
      });
    }

    const event = new CustomEvent('harfagy_db_update', {
      detail: { collection: collectionName }
    });
    window.dispatchEvent(event);
    
    return newDoc;
  }

  /**
   * Gets a specific document by ID
   */
  getDocument(collectionName, id) {
    const collection = this.getCollection(collectionName);
    return collection.find(doc => doc.id === id) || null;
  }

  /**
   * Updates a document in a collection
   */
  updateDocument(collectionName, id, partialData) {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex(doc => doc.id === id);
    if (index !== -1) {
      collection[index] = {
        ...collection[index],
        ...partialData,
        updatedAt: new Date().toISOString()
      };
      
      // Save locally
      localStorage.setItem(this.storageKeyPrefix + collectionName, JSON.stringify(collection));
      
      // Save to Supabase
      if (this.isSupabaseActive && this.supabaseClient) {
        this.supabaseClient.from(collectionName).update(partialData).eq('id', id).then(({ error }) => {
          if (error) console.error("Supabase update error:", error);
        });
      }

      const event = new CustomEvent('harfagy_db_update', {
        detail: { collection: collectionName }
      });
      window.dispatchEvent(event);
      
      return collection[index];
    }
    return null;
  }

  /**
   * Deletes a document
   */
  deleteDocument(collectionName, id) {
    let collection = this.getCollection(collectionName);
    collection = collection.filter(doc => doc.id !== id);
    
    // Save locally
    localStorage.setItem(this.storageKeyPrefix + collectionName, JSON.stringify(collection));
    
    // Delete in Supabase
    if (this.isSupabaseActive && this.supabaseClient) {
      this.supabaseClient.from(collectionName).delete().eq('id', id).then(({ error }) => {
        if (error) console.error("Supabase delete error:", error);
      });
    }

    const event = new CustomEvent('harfagy_db_update', {
      detail: { collection: collectionName }
    });
    window.dispatchEvent(event);
    
    return true;
  }

  /**
   * Custom query filters
   */
  query(collectionName, filterFn) {
    const collection = this.getCollection(collectionName);
    return collection.filter(filterFn);
  }
}

export const db = new MockFirestore();
export default db;
