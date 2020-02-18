import * as React from 'react';
import { Component } from 'react';
import { Form } from 'reactstrap';
import { SaveableControl } from './SaveableControl';
// import { Badge, Button, ButtonGroup } from 'reactstrap';
import { Spinner } from '.';
import { App } from './App';
import { BaseUrl } from '.';
// import { IEdit,  IParticipant, ITrip, TripState, IParticipantsInfo } from './Interfaces';
import { INewsletter, IValidation } from './Interfaces';
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
import { Newsletter } from './Newsletter';
// import { ToolTipIcon } from './ToolTipIcon';


export class TripsList extends Component<{
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
        this.props.app.apiCall('GET', BaseUrl+'/newsletters/current')
        .then((data:INewsletter) => {
            this.setState({current:data});
        })
        .then( () =>
        {
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
            })
        })
    }

    public componentDidMount(){
        this.requery()
    }

    public render(){
        const groups = this.state.groups.filter((group:ITrip[]) => group.length)
        return [
                // Current newsletter summary of link to create

                // Summaries of other newsletters
            ]
        }
}
