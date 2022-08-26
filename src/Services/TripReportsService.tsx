import { BaseUrl, DbApiURL } from '..';
import { ITripReport } from '../Interfaces';
import { apiCall } from '../Utilities';

export class TripReportsService {
    public static getTripReports(limit: number = 99999): Promise<ITripReport[]> {
        return apiCall('GET', DbApiURL + '/tripReports?limit=' + limit)
    }
}
