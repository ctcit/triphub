import * as React from 'react';
import { Button, Form } from 'reactstrap';
import { Component } from 'react';
import { IMember,  IParticipant, IValidation, IParticipantsInfo } from './Interfaces';
import { Spinner } from '.';
import { Trip } from './Trip';
import { App } from './App';
import { Expandable } from './Expandable';
import { Control } from './Control';
import { ToolTipIcon } from './ToolTipIcon';
import { TripParticipants } from './TripParticipants';

export class TripParticipant extends Component<{
        participant: IParticipant
        trip: Trip
        owner: TripParticipants
        app: App
        canWaitList?: boolean
        canUnwaitList?: boolean
        info: IParticipantsInfo
    },{
        id?: string,
        isSaveOp?: boolean,
        isWaitlistOp?: boolean,
        isMemberOp?: boolean,
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
        this.setDeleted = this.setDeleted.bind(this)
        this.setWaitlist = this.setWaitlist.bind(this)
        this.setMember = this.setMember.bind(this)
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
                participants[index].memberId = member.id
                participants[index].email = member.email 
                participants[index].phone = member.phone 
                participants[index].emergencyContactName = member.emergencyContactName
                participants[index].emergencyContactPhone = member.emergencyContactPhone
            } else {
                participants[index].memberId = 0
            }        
        }

        this.props.trip.setState({participants})
    }

    public validate() : IValidation[] {
        const participants = this.props.trip.state.participants

        return this.app.validateParticipant(participants.find((p:IParticipant) => p.id === this.props.participant.id) as IParticipant)
    }

    public setDeleted() {
        this.setState({isSaveOp:true})
        this.props.owner.setParticipant(this.props.participant.id, {isDeleted: !this.props.participant.isDeleted}).then(
            () => this.setState({isSaveOp:false})
        )
    }

    public setWaitlist() {

        this.setState({isMemberOp:true})
        this.props.owner.setPosition(this.props.participant.id, undefined).then(
            () => this.setState({isMemberOp:false})
        )
    }

    public setMember() {

        const member = this.props.app.getMemberById(this.props.participant.memberId)
        const emergencyContactName = this.props.participant.emergencyContactName
        const emergencyContactPhone = this.props.participant.emergencyContactPhone

        if (confirm(`Are you sure you want to update the contact details for ${member.name} ?`)) {
            this.setState({isMemberOp:true})
            this.props.app.apiCall('POST', member.href as string, {emergencyContactName, emergencyContactPhone}, false)
                .then(() => {
                    this.props.app.requeryMembers()
                    this.setState({isMemberOp:false})
                })
        }
    }

    public render(){
        const participant = this.props.participant
        const member = this.props.app.getMemberById(participant.memberId)
        const isPrivileged = this.props.trip.isPrivileged() || this.props.app.getMe().id === participant.memberId
        const isMemberDiff = participant.memberId === this.props.app.getMe().id &&
                             participant.memberId && (participant.emergencyContactName !== member.emergencyContactName ||
                                                      participant.emergencyContactPhone !== member.emergencyContactPhone)
        const common = {readOnly: !isPrivileged, owner: this}
        const iconid = `${participant.id || 'new'}`
        const logisticInfo = (participant.logisticInfo || '').trim()
        const validation = this.app.validateParticipant(participant).filter(v => !v.ok).map(v => v.message)
        const moveableIndex = this.props.info.moveable.map(m => m.id).indexOf(participant.id)
        const canMoveUp = moveableIndex > 0
        const canMoveDown = moveableIndex >= 0 && moveableIndex+1 < this.props.info.moveable.length
        const onDragStart = (ev:any) => ev.dataTransfer.setData('id', participant.id)
        const onDragOver = (ev:any) => ev.preventDefault()
        const onDrop = (ev:any) => this.props.owner.setPosition(parseInt(ev.dataTransfer.getData('id'),10), participant)
        const onMoveUp = (ev:any) => this.props.owner.setPosition(participant.id,this.props.info.moveable[moveableIndex-1],true)
        const onMoveDown = (ev:any) => this.props.owner.setPosition(participant.id,this.props.info.moveable[moveableIndex+1],true)

        const title = [
            participant.name === '' ? 'New Tramper' : participant.name,' ',
            validation.length > 0 ? <ToolTipIcon key='warning' icon='warning' tooltip={validation.join(', ')} className='warning-icon' id={iconid}/> : '',' ',
            participant.isLeader ? <ToolTipIcon key='leader' icon='star' tooltip={`${participant.name} is the leader`} id={iconid}/> : '',' ',
            participant.isPlbProvider ? <ToolTipIcon key='plb' icon='podcast' tooltip={`${participant.name} is bringing a PLB`} id={iconid}/> : '',' ',
            participant.isVehicleProvider ? <ToolTipIcon key='car' icon='car' tooltip={`${participant.name} is bringing a Car`} id={iconid}/> : '',' ',
            logisticInfo !== '' ? <ToolTipIcon key='logisticInfo' icon='commenting' tooltip={logisticInfo} id={iconid}/> : '',' ',
            participant.memberId === 0 && participant.id !== -1 ? <ToolTipIcon key='nonmember' icon='id-badge' tooltip={`${participant.name} is not a member of the CTC`} id={iconid}/> : '',' ',
        ]
        const buttons = [
            canMoveUp && isPrivileged ?
            <Button key='moveup' onClick={onMoveUp}>
                <span className='fa fa-angle-up'/>
            </Button> : null,
            canMoveDown && isPrivileged ?
            <Button key='movedown' onClick={onMoveDown}>
                <span className='fa fa-angle-down'/>
            </Button> : null,
            !participant.isDeleted && participant.href && isPrivileged ? 
            <Button key='delete' onClick={this.setDeleted}>
                <span className='fa fa-remove'/> 
                {this.state.isSaveOp ? ['Deleting ', Spinner] : 'Delete'}
            </Button> : null,
            participant.isDeleted && participant.href && isPrivileged ? 
            <Button key='undelete' onClick={this.setDeleted}>
                {this.state.isSaveOp ? ['Signing back up ', Spinner] : 'Sign back up'}
            </Button> : null,
            this.props.canWaitList && this.props.trip.isPrivileged(true) ? 
            <Button key='waitlist' onClick={this.setWaitlist}>
                {this.state.isWaitlistOp ? ['Adding to wait list ', Spinner] : 'Add to wait list'}
            </Button> : null,
            this.props.canUnwaitList && this.props.trip.isPrivileged(true) ? 
            <Button key='unwaitlist' onClick={this.setWaitlist}>
                {this.state.isWaitlistOp ? ['Removing from wait list ', Spinner] : 'Remove from wait list'}
            </Button> : null,
            isMemberDiff ?
            <Button key='ecdupdate' onClick={this.setMember}>
                {this.state.isMemberOp ? ['Updating emergency contact details ', Spinner] : 'Update emergency contact details'}
            </Button> : null,
        ]

        return (  
            <div onDrop={participant.isDeleted ? this.props.owner.onDropOnDeleted : onDrop} 
                 onDragOver={onDragOver} onDragStart={onDragStart} draggable={!participant.isLeader}>
                <Expandable title={title} id={`${participant.id}`} level={4} expanded={participant.id === -1} 
                            buttons={buttons.filter(b => b)} showMenu={participant.showMenu}>
                    <Form key='form' className='indentedparticipants'>
                        <Control id='name' label='Name' type='text' list='memberlist' {...common} 
                                                affected={['email','phone','memberid','emergency_contact']}/>
                        <Control id='email' label='Email' type='text' {...common}/>
                        <Control id='phone' label='Phone' type='text'  {...common}/>
                        <Control id='emergencyContactName' label='Emergency Contact Name' type='text' {...common}/>
                        <Control id='emergencyContactPhone' label='Emergency Contact Phone' type='text' {...common}/>
                        <Control id='isLeader' label='Leader' type='checkbox' {...common}/>
                        <Control id='isPlbProvider' label='Has PLB' type='checkbox' {...common}/>
                        <Control id='isVehicleProvider' label='Has Car' type='checkbox' {...common}/>
                        <Control id='vehicleRego' label='Rego' type='text' hidden={!participant.isVehicleProvider} 
                                                {...common}/>
                        <Control id='logisticInfo' label='Logistic Information' type='textarea' {...common}/>
                    </Form>
                </Expandable>
            </div>
        )
    }
}
