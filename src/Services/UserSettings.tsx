import { openDB, deleteDB, wrap, unwrap } from 'idb';

export class UserSettings {

    public static triphubDBName = 'triphub'
    public static userSettingsObjectStoreName = 'user-settings'


    public static idbSupported(): boolean {
        return true // TODO 'indexedDB' in window
    }

    public static async getCacheTrips(): Promise<boolean> {
        const db = await this.openDB()
        const value = await db.get(this.userSettingsObjectStoreName, 'cacheTrips') || false
        return value as boolean
    }

    public static async setCacheTrips(value: boolean): Promise<void> {
        const db = await this.openDB()
        await db.put(this.userSettingsObjectStoreName, value, 'cacheTrips');
    }

    private static async openDB(): Promise<any> {
        if (!this.idbSupported()) {
            return false
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