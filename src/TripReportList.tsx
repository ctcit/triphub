
import * as React from 'react';
import { Component } from 'react';
// import { Form, Button, Badge } from 'reactstrap';
// import { SaveableControl } from './SaveableControl';
import { Spinner, DbApiURL, BaseUrl  } from '.';
import { App } from './App';
import { ITripReport, INewsletterTripReport } from './Interfaces';
import './index.css';
import './print.css';
// import { TriphubNavbar } from './TriphubNavBar';
import { CapitaliseFirstLetter } from './Utilities';
import Table from 'reactstrap/lib/Table';


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
        // this.get = this.get.bind(this)
        // this.set = this.set.bind(this)
        // this.validate = this.validate.bind(this)
    }

    /*
    public get(id: string) : any{
        return this.state.newsletter[id]
    }

    public set(id: string, val: any) : void {
        this.state.newsletter[id] = val;
    }

    public validate() : IValidation[] {
        return [
            {id:'volume', ok: this.state.newsletter.volume > 0, message: 'Volume must be greater than zero'},
            {id:'number', ok: this.state.newsletter.number > 0, message: 'Number mest be greater than zero'},
            {id:'date', ok: IsValidDateString(this.state.newsletter.date), message: 'Newsletter date is not valid'},
            {id:'issueDate', ok: IsValidDateString(this.state.newsletter.issueDate), message: 'Issue date is not valid'},
            {id:'nextdeadline', ok: IsValidDateString(this.state.newsletter.nextdeadline), message: 'Next deadline is not a valid date'},
        ];
    }
    */

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
                            <th>Selected</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.tripreports.map(
                            (binding:TripReportBinding) => 
                            <tr key={"tripreport"+binding.tripReport.id}>
                                <td className="mobile-only"/>
                                <td>{binding.tripReport.date_display}</td>
                                <td>{binding.tripReport.title}</td>
                                <td>{CapitaliseFirstLetter(binding.tripReport.trip_type)}</td>
                                <td>{binding.newsLetterTripReport.publish}</td>
                            </tr>)}
                    </tbody>    
                </Table>
    }


}
