import { BaseUrl } from '..';
import { IMap } from '../Interfaces';
import { apiCall } from '../Utilities';

export class MapsService {

    // offline GET supported
    public static async getMaps(force: boolean = false): Promise<IMap[]> {
        if (force || !this.getMapsPromise) {
            this.getMapsPromise = new Promise<IMap[]>((resolve, reject) => {
                apiCall('GET', BaseUrl + '/maps')
                    .then((maps: IMap[]) => {
                        this.maps = maps.sort((a, b) => a.sheetCode.localeCompare(b.sheetCode));

                        this.mapsBySheet = {}
                        this.maps.forEach((map: IMap) => {
                            this.mapsBySheet[map.sheetCode] = map
                        })

                        resolve(maps);
                    });
            });
        }
        return this.getMapsPromise;
    }

    public static get Maps(): IMap[] {
        return this.maps;
    }

    public static get MapsBySheet(): { [mapSheet: string]: IMap } {
        return this.mapsBySheet;
    }

    private static getMapsPromise: Promise<IMap[]> | undefined = undefined

    private static maps: IMap[] = []
    private static mapsBySheet: { [mapSheet: string]: IMap } = {}


}
