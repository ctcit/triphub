import { BaseUrl } from '..';
import { IArchivedRoute } from '../Interfaces';
import { apiCall, apiCallReturnAll, apiCallReturnFirst } from '../Utilities';

export class ArchivedRoutesService {
    public static getArchivedRoutes(includeHidden: boolean = false, force: boolean = false): Promise<IArchivedRoute[]> {
        if (force || !this.getArchivedRoutesPromise || includeHidden !== this.getArchivedRoutesIncludeHidden) {
            this.getArchivedRoutesIncludeHidden = includeHidden;
            this.getArchivedRoutesPromise = apiCallReturnAll<IArchivedRoute>('GET', BaseUrl + '/routes?includeHidden=' + includeHidden)
                    .then((archivedRoutes: IArchivedRoute[]) => {
                        return archivedRoutes.sort((a, b) => a.title.localeCompare(b.title));
                    })
        }
        return this.getArchivedRoutesPromise;
    }

    public static async getArchivedRoute(id: number): Promise<IArchivedRoute | null> {
        return apiCallReturnFirst<IArchivedRoute>('GET', BaseUrl + '/routes/' + id)
    }

    public static async postArchivedRoute(newRoute: IArchivedRoute): Promise<IArchivedRoute | null> {
        return apiCallReturnFirst<IArchivedRoute>('POST', BaseUrl + '/routes', newRoute)
    }

    public static async patchArchivedRoute(id: number, data: any): Promise<IArchivedRoute | null> {
        return apiCallReturnFirst<IArchivedRoute>('PATCH', BaseUrl + '/routes/' + id, data)
    }

    public static async deleteArchivedRoute(id: number): Promise<any> {
        return apiCall('DELETE', BaseUrl + '/routes/' + id)
    }

    public static async getArchivedRoutesFromRoutesArchive(): Promise<IArchivedRoute[]> {
        return apiCallReturnAll<IArchivedRoute>('GET', BaseUrl + '/routesroutearchive')
    }

    public static async getArchivedRouteFromRoutesArchive(id: number): Promise<IArchivedRoute | null> {
        return apiCallReturnFirst<IArchivedRoute>('GET', BaseUrl + '/routesroutearchive/' + id)
    }

    public static async getArchivedRoutesFromTripReports(): Promise<IArchivedRoute[]> {
        return apiCallReturnAll<IArchivedRoute>('GET', BaseUrl + '/routestripreports')
    }

    public static async getArchivedRouteFromTripReports(id: number): Promise<IArchivedRoute | null> {
        return apiCallReturnFirst<IArchivedRoute>('GET', BaseUrl + '/routestripreports/' + id)
    }

    public static async getArchivedRoutesFromTripHub(): Promise<IArchivedRoute[]> {
        return apiCallReturnAll<IArchivedRoute>('GET', BaseUrl + '/routestriphub')
    }

    public static async getArchivedRouteFromTripHub(id: number): Promise<IArchivedRoute | null> {
        return apiCallReturnFirst<IArchivedRoute>('GET', BaseUrl + '/routestriphub/' + id)
    }

    private static getArchivedRoutesPromise: Promise<IArchivedRoute[]> | undefined = undefined
    private static getArchivedRoutesIncludeHidden: boolean = false

}
