import { BaseUrl } from '..';
import { INewsletter, INewsletterEvent, INewsletterTripReport } from '../Interfaces';
import { apiCall, apiCallReturnAll, apiCallReturnFirst } from '../Utilities';

export class NewslettersService {
    public static getNewslettersCurrent(): Promise<INewsletter[]> {
        return apiCallReturnAll<INewsletter>('GET', BaseUrl + '/newsletters/current')
    }

    public static getNewslettersLatest(): Promise<INewsletter[]> {
        return apiCallReturnAll<INewsletter>('GET', BaseUrl + '/newsletters/latest')
    }

    public static async postNewsletterSetCurrent(id: number): Promise<INewsletter | null> {
        return apiCallReturnFirst('POST', BaseUrl + '/newsletters/' + id + '/current')
    }

    public static async postNewNewsletter(newsletter: INewsletter): Promise<INewsletter | null> {
        return apiCallReturnFirst('POST', BaseUrl + '/newsletters', newsletter)
    }

    public static async postNewsletter(id: number, data: any): Promise<INewsletter | null> {
        return apiCallReturnFirst('POST', BaseUrl + '/newsletters/' + id, data)
    }

    public static getNewslettersEvents(): Promise<INewsletterEvent[]> {
        return apiCallReturnAll<INewsletterEvent>('GET', BaseUrl + '/newsletters/events')
    }

    public static getNewslettersUnpublishedEvents(): Promise<INewsletterEvent[]> {
        return apiCallReturnAll<INewsletterEvent>('GET', BaseUrl + '/newsletters/unpublishedEvents')
    }


    public static getNewslettersTripReports(id: number): Promise<INewsletterTripReport[]> {
        return apiCallReturnAll<INewsletterTripReport>('GET', BaseUrl + '/newsletters/' + id + '/tripreports')
    }

    public static postNewslettersTripReports(id: number, tripReports: INewsletterTripReport[]): Promise<any> {
        return apiCall('POST', BaseUrl + '/newsletters/' + id + '/tripreports', tripReports)
    }

    public static patchNewslettersTripReports(id: number, tripReports: INewsletterTripReport[]): Promise<any> {
        return apiCall('PATCH', BaseUrl + '/newsletters/' + id + '/tripreports', tripReports)
    }


}
