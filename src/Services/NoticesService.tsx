import { BaseUrl } from '..';
import { INotice } from '../Interfaces';
import { apiCall } from '../Utilities';

export class NoticesService {
    public static getNoticesCurrent(): Promise<INotice[]> {
        return apiCall('GET', BaseUrl + '/notices/current')
    }

    public static getNoticesExpired(limit?: number): Promise<INotice[]> {
        return apiCall('GET', BaseUrl + '/notices/expired' + (limit ? '?limit=' + limit : ''))
    }

    public static async postNewNotice(notice: INotice): Promise<INotice> {
        return apiCall('POST', BaseUrl + '/notices', notice)
            .then((notices: INotice[]) => notices[0])
    }

    public static async postNotice(id: number, notice: INotice): Promise<INotice> {
        return apiCall('POST', BaseUrl + '/notices/' + id, notice)
            .then((notices: INotice[]) => notices[0])
    }

    public static async patchNotice(id: number, data: any): Promise<INotice> {
        return apiCall('PATCH', BaseUrl + '/notices/' + id, data)
            .then((notices: INotice[]) => notices[0])
    }
}
