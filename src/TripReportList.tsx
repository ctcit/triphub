
import * as React from 'react';
import { Component } from 'react';
import { Spinner, DbApiURL, BaseUrl  } from '.';
import { App } from './App';
import { ITripReport, INewsletterTripReport } from './Interfaces';
import './index.css';
import './print.css';
import { CapitaliseFirstLetter } from './Utilities';
import Table from 'reactstrap/lib/Table';
import { SwitchControl } from './Control';


class TripReportBinding
{
    public newsLetterTripReport: INewsletterTripReport
    public tripReport: ITripReport
}

export class TripReportList extends Component<{
    app: App,
    newsletterId: number
    }, {
    tripreports: TripReportBinding[]
    }> {

    public app : App;

    constructor(props:any){
        super(props)
        this.state = {
            tripreports: []
        }
        this.app = this.props.app
    }


    public componentDidMount() {
        this.props.app.setStatus(['Loading ', Spinner])
        this.props.app.apiCall('GET', DbApiURL + "/recenttripreports/99999/90")
        .then((tripReports : ITripReport[]) => {
            this.props.app.apiCall('GET', BaseUrl + "/newsletters/" + this.props.newsletterId + "/tripreports")
            .then((newsletterTripReports : INewsletterTripReport[]) => {
                const tripReportBindings : TripReportBinding[] = []
                const newNewsletterTripReports : INewsletterTripReport[] = []
                tripReports.forEach(tripReport => {
                   let newsLetterTripReport : INewsletterTripReport | undefined = newsletterTripReports.find( r => r.tripreport === tripReport.id) 
                   if ( newsLetterTripReport === undefined )
                   {
                       // No record for this newsletter for this report yet - add one
                       newsLetterTripReport = {
                           newsletter: this.props.newsletterId,
                           tripreport: tripReport.id,
                           publish: (tripReport.trip_type === "club") ? true : false
                       }
                       newNewsletterTripReports.push(newsLetterTripReport)
                   }
                   tripReportBindings.push({tripReport, newsLetterTripReport})
                });
                this.setState({ tripreports: tripReportBindings })
                newsletterTripReports = newsletterTripReports.concat(newNewsletterTripReports)
                this.props.app.apiCall('POST', BaseUrl + "/newsletters/" + this.props.newsletterId + "/tripreports", newsletterTripReports)
            })
        })
    }

    public render() {
        return  <Table className='TripGroup' size='sm' striped={true}>
                    <thead>
                        <tr>
                            <th className='mobile-only'/>
                            <th>Date</th>
                            <th>Title</th>
                            <th>Type</th>
                            <th>Publish</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.tripreports.map(
                            (binding:TripReportBinding) =>  {
                                const onGet = (id: string ) : any => {
                                    return binding.newsLetterTripReport.publish
                                }
                                const onSave = (id: string, value: any ) : any => {
                                    return this.setPublishReport(binding.newsLetterTripReport, value)
                                }
                                const onGetValidationMessage = (id: string ) : any => {
                                    return ''
                                }
                                return <tr key={"tripreport"+binding.tripReport.id}>
                                    <td className="mobile-only"/>
                                    <td>{binding.tripReport.date_display}</td>
                                    <td>{binding.tripReport.title}</td>
                                    <td>{CapitaliseFirstLetter(binding.tripReport.trip_type)}</td>
                                    <td><SwitchControl id='publish' label='' isLoading={false} onGet={onGet}
                                        onSave={onSave} onGetValidationMessage={onGetValidationMessage} /></td>
                                </tr>
                            })
                        }
                    </tbody>    
                </Table>
    }

    private setPublishReport(tripReport: INewsletterTripReport, publish: boolean) : Promise<void> {
        tripReport.publish = publish;
        return this.props.app.apiCall('PATCH', BaseUrl + "/newsletters/" + this.props.newsletterId + "/tripreports", [tripReport,])
    }


}
