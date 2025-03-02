
import { Component } from 'react';
import { ITripReport, INewsletterTripReport } from '../Interfaces';
import '../index.css';
import { CapitaliseFirstLetter } from '../Utilities';
import { SwitchControl } from '../Control';
import { FullWidthLoading } from 'src/Widgets';
import { TripReportsService } from 'src/Services/TripReportsService';
import { NewslettersService } from 'src/Services/NewlettersService';
import { Table } from 'reactstrap';


interface ITripReportBinding
{
    newsLetterTripReport: INewsletterTripReport
    tripReport: ITripReport
}

export class TripReportList extends Component<{
    newsletterId: number
    }, {
    tripreports: ITripReportBinding[]
    isLoading: boolean
    }> {

    constructor(props:any){
        super(props)
        this.state = {
            tripreports: [],
            isLoading: true
        }
    }


    public componentDidMount() {
        if (this.props.newsletterId === 0) {
            return
        }
        const tripReportLimit = 999
        const tripReportDays = 120
        TripReportsService.getTripReports(tripReportLimit, tripReportDays)
        .then((tripReports : ITripReport[]) => {
            NewslettersService.getNewslettersTripReports(this.props.newsletterId)
            .then((newsletterTripReports : INewsletterTripReport[]) => {
                const tripReportBindings : ITripReportBinding[] = []
                tripReports.forEach(tripReport => {
                   let newsLetterTripReport : INewsletterTripReport | undefined = newsletterTripReports.find( r => r.tripreport === tripReport.id) 
                   if ( newsLetterTripReport === undefined )
                   {
                       // No record for this newsletter for this report yet - add one
                       newsLetterTripReport = {
                           newsletter: this.props.newsletterId,
                           tripreport: tripReport.id,
                           publish: false
                       }
                       newsletterTripReports.push(newsLetterTripReport)
                   }
                   tripReportBindings.push({tripReport, newsLetterTripReport})
                });
                this.setState({ tripreports: tripReportBindings, isLoading: false })
                NewslettersService.postNewslettersTripReports(this.props.newsletterId, newsletterTripReports)
            })
        })
    }

    public render() {
        return  (this.state.isLoading) ?
                <FullWidthLoading /> :
            (this.state.tripreports.length === 0) ?
            <p className='newsletter-no-trip-reports'>No trip reports this month :-(. Try posting on Facebook to encourage people to submit them!</p> :
            <Table className='TripGroup' size='sm' striped={true}>
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
                        (binding:ITripReportBinding) =>  {
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
                                <td><SwitchControl id='publish' field='publish' label='' isLoading={false} onGet={onGet}
                                    onSave={onSave} onGetValidationMessage={onGetValidationMessage} /></td>
                            </tr>
                        })
                    }
                </tbody>    
            </Table>
    }

    private setPublishReport(tripReport: INewsletterTripReport, publish: boolean) : Promise<void> {
        tripReport.publish = publish;
        return NewslettersService.patchNewslettersTripReports(this.props.newsletterId, [tripReport])
    }


}
