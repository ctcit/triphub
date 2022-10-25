import { openDB, deleteDB, wrap, unwrap } from 'idb';

export class UserSettings {
    public static inServiceWorker: boolean = false // to be set by the client

    public static triphubDBName = 'triphub'
    public static userSettingsObjectStoreName = 'user-settings'

    private static idbSupportedPromise: Promise<boolean> | undefined = undefined
    public static idbSupported(): boolean {
        return this.inServiceWorker || (typeof window !== 'undefined' && 'indexedDB' in window)
    }

    public static async getCacheTrips(): Promise<boolean> {
        const db = await this.openDB()
        return db ? await db.get(this.userSettingsObjectStoreName, 'cacheTrips') || false : false
    }

    public static async setCacheTrips(value: boolean): Promise<void> {
        const db = await this.openDB()
        if (db) {
            await db.put(this.userSettingsObjectStoreName, value, 'cacheTrips');
        }
    }

    private static async openDB(): Promise<any> {
        if (!this.idbSupported()) {
            return null
        }
        const userSettingsObjectStoreName = this.userSettingsObjectStoreName
        const db = await openDB(this.triphubDBName, 1, {
            upgrade(db) {
                db.createObjectStore(userSettingsObjectStoreName)
            }
        })
        return db
    }
}