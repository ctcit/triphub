import * as React from 'react';
import { Button, Form, Navbar, ButtonGroup, ListGroup, ListGroupItem  } from 'reactstrap';
import { Component } from 'react';
import { IMember,  IParticipant, IValidation } from './Interfaces';
import { Spinner, ToolTipIcon } from '.';
import { Trip } from './Trip';
import { AppState, App } from './App';
import { Expandable } from './Expandable';
import { Control } from './Control';
import { GetDisplayPriority } from './Utilities';

class TripParticipant extends Component<{
        participant: IParticipant
        trip: Trip
        owner: TripParticipants
        app: App
        canWaitList?: boolean
        canUnwaitList?: boolean
    },{
      id?: string,
      is_save_op?: boolean,
      is_waitlist_op?: boolean,
    }> {

    public href?: string;
    public app: App

    constructor(props : any){
        super(props)
        this.state = {}
        this.href = this.props.participant.href
        this.app = this.props.app
        this.get = this.get.bind(this)
        this.set = this.set.bind(this)
        this.validate = this.validate.bind(this)
    }

    public get(id: string) : any{
        const participants = this.props.trip.state.participants

        return (participants.find((p:IParticipant) => p.id === this.props.participant.id) || {})[id]
    }

    public set(id: string, val?: any) : any{
        const participants = [...this.props.trip.state.participants]
        const participant = participants.find((p:IParticipant) => p.id === this.props.participant.id) as IParticipant
        const index = participants.indexOf(participant) 

        participants[index] = {...participant, [id]: val}

        if (id === 'name') {
            const member = this.props.app.getMembers().find((m:IMember) => m.name === val)

            this.props.owner.setState({namePrefix:val as string})

            if (member) {
                participants[index].member_id = member.id
                participants[index].email = member.email 
                participants[index].phone = member.phone 
            } else {
                participants[index].member_id = 0
            }        
        }

        this.props.trip.setState({participants})
    }

    public validate() : IValidation[] {
        const participants = this.props.trip.state.participants

        return this.app.validateParticipant(participants.find((p:IParticipant) => p.id === this.props.participant.id) as IParticipant)
    }

    public render(){
        const participant = this.props.participant
        const is_privileged = this.props.trip.isPrivileged() || this.props.app.getMe().id === participant.member_id
        const readOnly = {readOnly: !is_privileged}
        const iconid = `${participant.id || 'new'}`
        const logistic_info = (participant.logistic_info || '').trim()
        const validation = this.app.validateParticipant(participant).filter(v => !v.ok).map(v => v.message)
        const setDeleted = () => this.props.owner.setParticipant(participant.id, {is_deleted: !participant.is_deleted})
        const setWaitlist = () => this.props.owner.setPosition(participant.id, undefined)
        const onDragStart = (ev:any) => ev.dataTransfer.setData('id', participant.id)
        const onDragOver = (ev:any) => ev.preventDefault()
        const onDrop = (ev:any) => this.props.owner.setPosition(ev.dataTransfer.getData('id'), participant)

        const title = [
            participant.name === '' ? 'New Tramper' : participant.name,' ',
            validation.length > 0 ? <ToolTipIcon key='warning' icon='warning' tooltip={validation.join(', ')} className='warning-icon' id={iconid}/> : '',' ',
            participant.is_leader ? <ToolTipIcon key='leader' icon='star' tooltip={`${participant.name} is the leader`} id={iconid}/> : '',' ',
            participant.is_plb_provider ? <ToolTipIcon key='plb' icon='podcast' tooltip={`${participant.name} is bringing a PLB`} id={iconid}/> : '',' ',
            participant.is_vehicle_provider ? <ToolTipIcon key='car' icon='car' tooltip={`${participant.name} is bringing a Car`} id={iconid}/> : '',' ',
            logistic_info !== '' ? <ToolTipIcon key='logistic_info' icon='commenting' tooltip={logistic_info} id={iconid}/> : '',' ',
            participant.member_id === 0 && participant.id !== -1 ? <ToolTipIcon key='nonmember' icon='id-badge' tooltip={`${participant.name} is not a member of the CTC`} id={iconid}/> : '',' ',
        ]
        const buttons = [
            !participant.is_deleted && participant.href && is_privileged ? 
            <Button key='delete' onClick={setDeleted}>
                <span className='fa fa-remove'/> 
                {this.state.is_save_op ? ['Deleting ', Spinner] : 'Delete'}
            </Button> : null,
            participant.is_deleted && participant.href && is_privileged ? 
            <Button key='undelete' onClick={setDeleted}>
                {this.state.is_save_op ? ['Signing back up ', Spinner] : 'Sign back up'}
            </Button> : null,
            this.props.canWaitList && this.props.trip.isPrivileged(true) ? 
            <Button key='waitlist' onClick={setWaitlist}>
                {this.state.is_waitlist_op ? ['Adding to wait list ', Spinner] : 'Add to wait list'}
            </Button> : null,
            this.props.canUnwaitList && this.props.trip.isPrivileged(true) ? 
            <Button key='unwaitlist' onClick={setWaitlist}>
                {this.state.is_waitlist_op ? ['Removing from wait list ', Spinner] : 'Remove from wait list'}
            </Button> : null,
        ]

        return (  
            <div onDrop={onDrop} onDragOver={onDragOver} onDragStart={onDragStart} draggable={true}>
                <Expandable title={title} id={`${participant.id}`} level={4} expanded={participant.id === -1} buttons={buttons.filter(b => b)}>
                    <Form key='form' className='indentedparticipants'>
                        <Control owner={this} id='name' key='name' label='Name' type='text' list='memberlist' {...readOnly} affected={['email','phone','memberid']}/>
                        <Control owner={this} id='email' key='email' label='Email' type='text' {...readOnly}/>
                        <Control owner={this} id='phone' key='phone' label='Phone' type='text'  {...readOnly}/>
                        <Control owner={this} id='is_leader' key='is_leader' label='Leader' type='checkbox' {...readOnly}/>
                        <Control owner={this} id='is_plb_provider' key='is_plb_provider' label='Has PLB' type='checkbox' {...readOnly}/>
                        <Control owner={this} id='is_vehicle_provider' key='is_vehicle_provider' label='Has Car' type='checkbox' {...readOnly}/>
                        <Control owner={this} id='vehicle_rego' key='vehicle_rego' label='Rego' type='text' hidden={!participant.is_vehicle_provider} {...readOnly}/>
                        <Control owner={this} id='logistic_info' key='logistic_info' label='Logistic Information' type='textarea' {...readOnly}/>
                    </Form>
                </Expandable>
            </div>
        )
    }
}

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
        this.participant = React.createRef()
    }

    public signUpTramper(){
        const participants = this.props.trip.state.participants

        this.props.trip.setState({participants:[this.props.trip.blankTramper(), ...participants]})
    }

    public signMeUp(){
        this.props.trip.setState({is_saving:true})
        this.props.app.apiCall('POST', this.props.trip.props.triphref + '/participants', this.props.trip.signMeUpTramper(), true)
            .then(this.props.trip.requeryParticipants)
    }

    public signUpTramperSave(){
        const participant = this.props.trip.state.participants[0]

        this.props.trip.setState({is_saving:true})
        this.props.app.apiCall('POST', this.props.trip.props.triphref + '/participants', participant, true)
            .then(this.props.trip.requeryParticipants)
    }

    public signUpTramperCancel(){
        this.props.trip.setState({participants: this.props.trip.state.participants.filter((p:any) => p.id !== 'new')})
    }

    public setPosition(id : number, target?: IParticipant ) {
        if (target && target.is_deleted) {
            this.setParticipant(id, {is_deleted:true})
            return
        }

        const info = this.props.trip.getParticipantsInfo()
        const source = info.all.find(p => p.id === id) as IParticipant
        const source_index = info.non_deleted.indexOf(source)
        let display_priority = source.id

        if (info.non_deleted.length) {
            if (!target) {
                target = source.is_deleted 
                            ? info.non_deleted[info.non_deleted.length-1] 
                            : info.non_deleted[info.max_participants + (source_index < info.max_participants ? 0 : -1)]
            }

            const target_index = info.non_deleted.indexOf(target)
            const next_index = source_index < target_index || source.is_deleted ? target_index + 1 : target_index - 1
            
            display_priority = next_index < 0 
                                ? GetDisplayPriority(target) - 1
                                : next_index >= info.non_deleted.length 
                                    ? GetDisplayPriority(target) + 1
                                    : GetDisplayPriority(target)/2 + GetDisplayPriority(info.non_deleted[next_index])/2
        }

        this.setParticipant(id, {is_deleted:'0',display_priority:display_priority.toString()})
    }

    public setParticipant(id : number, props : {}) {

        const participants = [...this.props.trip.state.participants]
        const participant = participants.find((p:IParticipant) => p.id === id) as IParticipant
        const index = participants.indexOf(participant) 

        participants[index] = {...participant, ...props}

        this.props.trip.setState({participants})
        this.props.app.apiCall('POST', participant.href as string, props, true)
    }

    public render() {
        const me = this.props.app.getMe()
        const info = this.props.trip.getParticipantsInfo()
        const loading = this.props.app.state.loading
        const is_open = this.props.trip.state.trip.is_open || this.props.trip.isPrivileged()
        const is_new_trip = this.props.app.state.appState === AppState.New
        const has_new_tramper = info.all.find((p:IParticipant) => p.id === -1)
        const im_on_list = info.all.find((m:IParticipant) => m.member_id === me.id)
        const onDragOver = (ev:any) => ev.preventDefault()
        const onDropOnWaitlist = (ev:any) => this.setPosition(ev.dataTransfer.getData('id'), undefined)
        const onDropOnDeleted = (ev:any) => this.setParticipant(ev.dataTransfer.getData('id'), {is_deleted:'1'})

        return  [
            <Navbar key='navbar' color='light' light={true} expand='md'>
            {[
                <Button key={'signmeup' + info.all.length} onClick={this.signMeUp} hidden={loading || is_new_trip || !!im_on_list || !is_open}>
                    <span className='fa fa-pencil wiggle'/> 
                    {this.props.trip.state.is_saving ? ['Signing up ',Spinner] : 'Sign me up!'}
                </Button>,
                <Button key={'signup' + info.all.length} onClick={this.signUpTramper} hidden={loading || is_new_trip || !!has_new_tramper || !is_open}>
                    <span className='fa fa-user-plus'/> Sign up a tramper
                </Button>,
                <ButtonGroup key={'signupcomplete' + info.all.length}  hidden={loading || is_new_trip || !has_new_tramper || !is_open}>
                    <Button onClick={this.signUpTramper} disabled={true}>
                        <span className='fa fa-user-plus'/> Sign up a tramper:
                    </Button>
                    <Button key='save' color='primary' onClick={this.signUpTramperSave}>
                        {this.props.trip.state.is_saving ? ['Saving ',Spinner] : 'Save'}
                    </Button>
                    <Button key='cancel' color='primary' onClick={this.signUpTramperCancel}>
                        Cancel
                    </Button>
                </ButtonGroup>,
                <span key={'participants' + info.all.length} hidden={loading || is_new_trip}>
                    &nbsp; {info.current.length} Participants
                </span>
            ]}
            </Navbar>,
            <ListGroup key='participants'>
                <ListGroupItem>
                    {
                        info.current.map(p =>
                            <TripParticipant key={`${p.id}${p.display_priority}${p.is_deleted}`} participant={p} trip={this.props.trip} owner={this} app={this.props.app} canWaitList={info.waitlist.length !== 0} 
                                            ref={this.participant}/>)
                    }
                </ListGroupItem>
                <ListGroupItem hidden={info.current.length !== info.max_participants}>
                    <div onDragOver={onDragOver} onDrop={onDropOnWaitlist}>Waitlist</div>
                    {
                        info.waitlist.map(p =>
                            <TripParticipant key={`${p.id}${p.display_priority}${p.is_deleted}`} participant={p} trip={this.props.trip} owner={this} app={this.props.app} canUnwaitList={true}/>)
                    }
                </ListGroupItem>
                <ListGroupItem hidden={is_new_trip}>
                    <div onDragOver={onDragOver} onDrop={onDropOnDeleted}>Deleted</div>
                    {
                        info.deleted.map(p =>
                            <TripParticipant key={`${p.id}${p.display_priority}${p.is_deleted}`} participant={p} trip={this.props.trip} owner={this} app={this.props.app}/>)
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
