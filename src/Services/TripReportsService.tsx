import { DbApiURL } from '..';
import { ITripReport } from '../Interfaces';
import { apiCallReturnAll } from '../Utilities';

export class TripReportsService {
    public static getTripReports(limit: number = 99999): Promise<ITripReport[]> {
        return apiCallReturnAll<ITripReport>('GET', DbApiURL + '/tripreports?limit=' + limit)
    }
}
