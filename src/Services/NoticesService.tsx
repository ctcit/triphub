import { BaseUrl } from '..';
import { INotice } from '../Interfaces';
import { apiCall, apiCallReturnAll, apiCallReturnFirst } from '../Utilities';

export class NoticesService {
    public static getNoticesCurrent(): Promise<INotice[]> {
        return apiCallReturnAll<INotice>('GET', BaseUrl + '/notices/current')
    }

    public static getNoticesExpired(limit?: number): Promise<INotice[]> {
        return apiCallReturnAll<INotice>('GET', BaseUrl + '/notices/expired' + (limit ? '?limit=' + limit : ''))
    }

    public static async postNewNotice(notice: INotice): Promise<INotice | null> {
        return apiCallReturnFirst<INotice>('POST', BaseUrl + '/notices', notice)
    }

    public static async postNotice(id: number, notice: INotice): Promise<INotice | null> {
        return apiCallReturnFirst<INotice>('POST', BaseUrl + '/notices/' + id, notice)
    }

    public static async patchNotice(id: number, data: any): Promise<INotice | null> {
        return apiCallReturnFirst<INotice>('PATCH', BaseUrl + '/notices/' + id, data)
    }
}
