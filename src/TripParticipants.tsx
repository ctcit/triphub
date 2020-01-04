import * as React from 'react';
import { Button, Navbar, ButtonGroup, ListGroup, ListGroupItem  } from 'reactstrap';
import { Component } from 'react';
import { IMember,  IParticipant } from './Interfaces';
import { Spinner } from '.';
import { Trip } from './Trip';
import { App } from './App';
import { GetDisplayPriority } from './Utilities';
import { TripParticipant } from './TripParticipant';

export class TripParticipants extends Component<{
        trip: Trip,    
        app: App,
    },{
        namePrefix?: string
    }> {

      public participant : React.RefObject<any>

      constructor(props: any){
        super(props)
        this.state = {}
        this.signMeUp = this.signMeUp.bind(this)
        this.signUpTramper = this.signUpTramper.bind(this)
        this.signUpTramperSave = this.signUpTramperSave.bind(this)
        this.signUpTramperCancel = this.signUpTramperCancel.bind(this)
        this.setPosition = this.setPosition.bind(this)
        this.setParticipant = this.setParticipant.bind(this)
        this.onDropOnDeleted = this.onDropOnDeleted.bind(this)
        this.participant = React.createRef()
    }

    public signUpTramper(){
        const participants = this.props.trip.state.participants

        this.props.trip.setState({participants:[this.props.trip.blankTramper(), ...participants]})
    }

    public signMeUp(){

        if (!this.props.app.getMe().id) {
            const newMembersRep = this.props.app.state.members[0]
            alert(`Non members are most welcome to join club trips.\n`+
                  `Please either:\n`+
                  `• Get to meet us at our weekly meetings at\n` +
                  `     Canterbury Mineral and Lapidary Club rooms,\n` +
                  `     110 Waltham Rd, Waltham; or\n` +
                  `• Contact ${newMembersRep.name} via the via the prospective members form`)
            return
        }

        this.props.trip.setState({isSaving:true})
        this.props.app.apiCall('POST', this.props.trip.props.href + '/participants', this.props.trip.signMeUpTramper(), true)
            .then(this.props.trip.requeryParticipants)
    }

    public signUpTramperSave(){
        const participant = this.props.trip.state.participants[0]

        this.props.trip.setState({isSaving:true})
        this.props.app.apiCall('POST', this.props.trip.props.href + '/participants', participant, true)
            .then(this.props.trip.requeryParticipants)
    }

    public signUpTramperCancel(){
        this.props.trip.setState({participants: this.props.trip.state.participants.filter((p:any) => p.id !== -1)})
    }

    public setPosition(id : number, target?: IParticipant, showMenu? : boolean ) : Promise<any> {
        const info = this.props.trip.getParticipantsInfo()
        const source = info.all.find(p => p.id === id) as IParticipant
        const sourceIndex = info.moveable.indexOf(source)
        let displayPriority = source.id

        if (info.moveable.length) {
            if (!target) {
                target = source.isDeleted 
                            ? info.moveable[info.moveable.length-1] 
                            : info.moveable[info.maxParticipants + (sourceIndex < info.maxParticipants ? 0 : -1)]
            }

            const targetIndex = info.moveable.indexOf(target)
            const nextIndex = sourceIndex < targetIndex || source.isDeleted ? targetIndex + 1 : targetIndex - 1
            
            displayPriority = nextIndex < 0 
                                ? GetDisplayPriority(target) - 1
                                : nextIndex >= info.moveable.length 
                                    ? GetDisplayPriority(target) + 1
                                    : GetDisplayPriority(target)/2 + GetDisplayPriority(info.moveable[nextIndex])/2
        }

        return this.setParticipant(id, {isDeleted:false,displayPriority:displayPriority.toString()},showMenu)
    }

    public setParticipant(id : number, props : {}, showMenu?: boolean) : Promise<any> {

        const participants = [...this.props.trip.state.participants]
        const participant = participants.find((p:IParticipant) => p.id === id) as IParticipant
        const index = participants.indexOf(participant) 

        participants[index] = {...participant, ...props, showMenu}

        this.props.trip.setState({participants})
        return this.props.app.apiCall('POST', `${this.props.trip.props.href}/participants/${id}`, props, true)
    }

    public onDropOnDeleted(ev:any) 
    {
        this.setParticipant(parseInt(ev.dataTransfer.getData('id'),10), {isDeleted:true})
    }

    public render() {
        const me = this.props.app.getMe()
        const anon = !me.id
        const info = this.props.trip.getParticipantsInfo()
        const loading = this.props.app.state.isLoading
        const isPrivileged = this.props.trip.isPrivileged()
        const isOpen = this.props.trip.state.trip.isOpen || isPrivileged
        const isNewTrip = this.props.trip.props.isNew
        const hasNewTramper = !!info.all.find((p:IParticipant) => p.id === -1)
        const imOnList = !!info.all.find((m:IParticipant) => m.memberId === me.id)
        const onDragOver = (ev:any) => ev.preventDefault()
        const onDropOnWaitlist = (ev:any) => this.setPosition(parseInt(ev.dataTransfer.getData('id'),10), undefined)

        return  [
            <Navbar key='navbar' color='light' light={true} expand='md'>
            {[
                <Button key={'signmeup' + info.all.length} onClick={this.signMeUp} hidden={loading || isNewTrip || imOnList || !isOpen}>
                    <span className='fa fa-pencil wiggle'/> 
                    {this.props.trip.state.isSaving ? ['Signing up ',Spinner] : 'Sign me up!'}
                    {info.current.length >= info.maxParticipants ? " (on waitlist)" : ""}
                </Button>,
                <Button key={'signup' + info.all.length} onClick={this.signUpTramper} hidden={loading || isNewTrip || hasNewTramper || !isOpen || anon || !isPrivileged}>
                    <span className='fa fa-user-plus'/> Sign up a tramper
                    {info.current.length >= info.maxParticipants ? " (on waitlist)" : ""}
                </Button>,
                <ButtonGroup key={'signupcomplete' + info.all.length}  hidden={loading || isNewTrip || !hasNewTramper || !isOpen}>
                    <Button onClick={this.signUpTramper} disabled={true}>
                        <span className='fa fa-user-plus'/> Sign up a tramper:
                    </Button>
                    <Button key='save' color='primary' onClick={this.signUpTramperSave}>
                        {this.props.trip.state.isSaving ? ['Saving ',Spinner] : 'Save'}
                    </Button>
                    <Button key='cancel' color='primary' onClick={this.signUpTramperCancel}>
                        Cancel
                    </Button>
                </ButtonGroup>,
                <span key={'participants' + info.all.length} hidden={loading || isNewTrip}>
                    &nbsp; {info.early.length} Participants
                </span>
            ]}
            </Navbar>,
            <ListGroup key='participants'>
                <ListGroupItem>
                    {
                        info.current.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} participant={p} trip={this.props.trip} 
                                    owner={this} app={this.props.app} canWaitList={info.late.length !== 0} ref={this.participant}
                                    info={info}/>)
                    }
                </ListGroupItem>
                <ListGroupItem hidden={info.late.length === 0}>
                    <div onDragOver={onDragOver} onDrop={onDropOnWaitlist}>Waitlist</div>
                    {
                        info.late.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} participant={p} trip={this.props.trip} 
                                    owner={this} app={this.props.app} canUnwaitList={true} info={info}/>)
                    }
                </ListGroupItem>
                <ListGroupItem hidden={isNewTrip || info.deleted.length === 0}>
                    <div onDragOver={onDragOver} onDrop={this.onDropOnDeleted}>Deleted</div>
                    {
                        info.deleted.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} participant={p} trip={this.props.trip} 
                                    owner={this} app={this.props.app} info={info}/>)
                    }
                </ListGroupItem>
            </ListGroup>,
            <datalist key='memberlist' id='memberlist'>
                {this.props.app.getMembers()
                     .filter((m:IMember) => this.state.namePrefix && m.name.toUpperCase().startsWith(this.state.namePrefix.toUpperCase()))
                     .filter((m:IMember, i:number) => i < 10)
                     .map((m:any) => <option key={'datalistoption'+m.id} value={m.name} />)}
            </datalist>
        ]
    }
}
