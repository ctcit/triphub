import * as React from 'react';
import { Component } from 'react';
// import { Badge, Button, ButtonGroup } from 'reactstrap';
// import { BaseUrl, Spinner } from '.';
import { App } from './App';
// import { IEdit,  IParticipant, ITrip, TripState, IParticipantsInfo } from './Interfaces';
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
// import { ToolTipIcon } from './ToolTipIcon';


export class Newsletter extends Component<{app: App}, {}>
    {

       // public suggestedTrip: {trip: ITrip, participants: IParticipant[]};

      constructor(props:any){
        super(props)
        this.state = {
        }
        // this.requeryParticipants = this.requeryParticipants.bind(this)
    }


    // public componentDidMount(){
    // }

    // public componentWillUnmount(){
    // }

    public render(){
                          

        return [
            <TriphubNavbar key='triphubnavbar' app={this.props.app}/>,
            <h1 key="title">Newsletter Management</h1>
        ]
    }
}
