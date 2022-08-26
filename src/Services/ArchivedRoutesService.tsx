import { BaseUrl } from '..';
import { IArchivedRoute } from '../Interfaces';
import { apiCall } from '../Utilities';

export class ArchivedRoutesService {
    public static getArchivedRoutes(includeHidden: boolean = false, force: boolean = false): Promise<IArchivedRoute[]> {
        if (force || !this.getArchivedRoutesPromise || includeHidden !== this.getArchivedRoutesIncludeHidden) {
            this.getArchivedRoutesIncludeHidden = includeHidden;
            this.getArchivedRoutesPromise = new Promise<IArchivedRoute[]>((resolve, reject) => {
                apiCall('GET', BaseUrl + '/routes?includeHidden=' + includeHidden)
                    .then((archivedRoutes: IArchivedRoute[]) => {
                        this.archivedRoutes = archivedRoutes;
                        resolve(archivedRoutes);
                    }, () => {
                        this.archivedRoutes = [];
                        resolve([])
                    });
            });
        }
        return this.getArchivedRoutesPromise;
    }

    public static ArchivedRoutes(): IArchivedRoute[] {
        return this.archivedRoutes;
    }

    public static async getArchivedRoute(id: number): Promise<IArchivedRoute> {
        return apiCall('GET', BaseUrl + '/routes/' + id)
            .then((archivedRoutes: IArchivedRoute[]) => archivedRoutes[0])
    }

    public static async postArchivedRoute(newRoute: IArchivedRoute): Promise<IArchivedRoute> {
        return apiCall('POST', BaseUrl + '/routes', newRoute)
            .then((archivedRoutes: IArchivedRoute[]) => archivedRoutes[0])
    }

    public static async patchArchivedRoute(id: number, data: any): Promise<IArchivedRoute> {
        return apiCall('PATCH', BaseUrl + '/routes/' + id, data)
            .then((archivedRoutes: IArchivedRoute[]) => archivedRoutes[0])
    }

    public static async deleteArchivedRoute(id: number): Promise<any> {
        return apiCall('DELETE', BaseUrl + '/routes/' + id)
    }

    public static async getArchivedRoutesFromRoutesArchive(): Promise<IArchivedRoute[]> {
        return apiCall('GET', BaseUrl + '/routesroutearchive')
    }

    public static async getArchivedRouteFromRoutesArchive(id: number): Promise<IArchivedRoute> {
        return apiCall('GET', BaseUrl + '/routesroutearchive/' + id)
        .then((archivedRoutes: IArchivedRoute[]) => archivedRoutes[0])
    }

    public static async getArchivedRoutesFromTripReports(): Promise<IArchivedRoute[]> {
        return apiCall('GET', BaseUrl + '/routestripreports')
    }

    public static async getArchivedRouteFromTripReports(id: number): Promise<IArchivedRoute> {
        return apiCall('GET', BaseUrl + '/routestripreports/' + id)
        .then((archivedRoutes: IArchivedRoute[]) => archivedRoutes[0])
    }

    public static async getArchivedRoutesFromTripHub(): Promise<IArchivedRoute[]> {
        return apiCall('GET', BaseUrl + '/routestriphub')
    }

    public static async getArchivedRouteFromTripHub(id: number): Promise<IArchivedRoute> {
        return apiCall('GET', BaseUrl + '/routestriphub/' + id)
        .then((archivedRoutes: IArchivedRoute[]) => archivedRoutes[0])
    }

    private static getArchivedRoutesPromise: Promise<IArchivedRoute[]> | undefined = undefined
    private static getArchivedRoutesIncludeHidden: boolean = false
    private static archivedRoutes: IArchivedRoute[] = []

}
