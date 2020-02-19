import * as React from 'react';
import { Component } from 'react';
// import { Form } from 'reactstrap';
// import { SaveableControl } from './SaveableControl';
// import { Badge, Button, ButtonGroup } from 'reactstrap';
// import { Spinner } from '.';
// import { App } from './App';
// import { BaseUrl } from '.';
import { FormatDate } from './Utilities';
import { Button } from 'reactstrap';
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
// import { TriphubNavbar } from './TriphubNavBar';
// import { Newsletter } from './Newsletter';
import { NewsletterList } from './NewsletterList';
// import { ToolTipIcon } from './ToolTipIcon';


export class NewsletterLine extends Component<{
    owner: NewsletterList,
    newsletter: INewsletter,
    },{}> {
    constructor(props: any){
        super(props)
        this.onClick = this.onClick.bind(this) 
    }

    public onClick() {
        this.props.owner.props.app.setPath('/newsletters/' + this.props.newsletter.id)
    }

    public render(){
        // const app = this.props.owner.props.app
        const newsletter = this.props.newsletter
        const id = newsletter.id
        // const me = this.props.owner.props.app.getMe()
        // let validation = app.validateTrip(newsletter).filter(i => !i.ok)

        /*
        const extractWarnings = (match:RegExp) => {
            const errors = validation.filter(i => match.test(i.id))
            validation = validation.filter(i => !match.test(i.id))
            return errors.map((e,i)=> <ToolTipIcon key={i} icon='warning' id={id + 'warning' + e.id + '_' + i} 
                                        tooltip={e.message} className='warning-icon'/>)
        }
        */
       console.log(newsletter.date)


        return [
            <td key={'volume' + id} onClick={this.onClick}>
                {newsletter.volume}
            </td>,
            <td key={'number' + id} onClick={this.onClick}>
                {newsletter.number}
            </td>,
            <td key={'date' + id} onClick={this.onClick}>
                {FormatDate(newsletter.date)}
            </td>,
            <td key={'issueDate' + id} onClick={this.onClick}>
                {FormatDate(newsletter.issueDate)}
            </td>,
            <td key={'nextdeadline' + id} onClick={this.onClick}>
                {FormatDate(newsletter.nextdeadline)}
            </td>,
            <td key={'link' + id}>
                <Button color='link' onClick={this.onClick}>▶</Button>
            </td>
        ]
    }
}
