import * as React from 'react';
import { Component } from 'react';
// import { Form } from 'reactstrap';
// import { SaveableControl } from './SaveableControl';
// import { Badge, Button, ButtonGroup } from 'reactstrap';
import { Spinner } from '.';
import { App } from './App';
import { BaseUrl } from '.';
// import { IEdit,  IParticipant, ITrip, TripState, IParticipantsInfo } from './Interfaces';
import { INewsletter } from './Interfaces';
// import { GetDateString, AddDays, GetDisplayPriority, SafeJsonParse } from './Utilities';
// import { TripDetail } from './TripDetail';
// import { TripParticipants } from './TripParticipants';
// import { History } from './History';
// import { Expandable } from './Expandable';
// import { Email } from './Email';
// import { TripPrint } from './TripPrint';
import './index.css';
import './print.css';
import { TriphubNavbar } from './TriphubNavBar';
import { NewsletterLine } from './NewsletterLine';
// import { ToolTipIcon } from './ToolTipIcon';


export class NewsletterList extends Component<{
    app: App
  },{
    newsletters: INewsletter[],
    current: INewsletter,
  }> {
    constructor(props: any){
        super(props)
        this.state = {
            newsletters: [],
            current: {id:0} as INewsletter
        }
        this.requery = this.requery.bind(this)
    }

    public requery() {
        this.props.app.setStatus(['Loading ', Spinner]);
        // PENDING - some way of doing pagination, or by year or something
        this.props.app.apiCall('GET',BaseUrl + '/newsletters')
        .then((data:INewsletter[]) => {

        // const newsletters : INewsletter[] = []

        // for (const item of data) {
        //     newsletters.push(item)
        // }

        this.setState({newsletters: data})
        this.props.app.setStatus('Loaded', 3000)
        this.props.app.setState({isLoading:false});
        });
    }

    public componentDidMount(){
        this.props.app.apiCall('GET', BaseUrl+'/newsletters/current')
        .then((data:INewsletter) => {
            this.setState({current:data});
        });
        this.requery()
    }

    public render(){
        return [
                <TriphubNavbar key='triphubNavbar' app={this.props.app}/>,
                // Current newsletter summary of link to create
                <h2 key='currentNewsletterTitle'>Current Newsletter</h2>,
                // <NewsletterLine key='currentNewsltter' owner={this} newsletter={this.state.current}/> ,

                // Summaries of other newsletters
                <h2 key='pastNewslettersTitle'>Past newsletters</h2>,
                this.state.newsletters.map( (newsletter) =>
                {
                    return <NewsletterLine key={'pastNewsletter'+newsletter.id} owner={this} newsletter={newsletter}/>
                })
            ]
        }
}
