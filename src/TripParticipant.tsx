import * as React from 'react';
import { Form, Row, Col, Container, ButtonGroup } from 'reactstrap';
import { Component } from 'react';
import { IMember,  IParticipant, IValidation, IParticipantsInfo, Role } from './Interfaces';
import { Spinner } from './Widgets';
import { Trip } from './Trip';
import { App } from './App';
import { InputControl, SwitchControl, TextAreaInputControl } from './Control';
import { ToolTipIcon } from './ToolTipIcon';
import { TripParticipants } from './TripParticipants';
import { Accordian } from './Accordian';
import { ButtonWithTooltip } from './ButtonWithTooltip';

export class TripParticipant extends Component<{
        participant: IParticipant
        trip: Trip
        owner: TripParticipants
        app: App
        loading: boolean
        canWaitList?: boolean
        canUnwaitList?: boolean
        info: IParticipantsInfo
    },{
        id?: string,
        isSaveOp?: boolean,
        isWaitlistOp?: boolean,
        isMemberOp?: boolean,
        showMenu : boolean
    }> {

    public href?: string;
    public app: App

    constructor(props : any){
        super(props)
        this.state = {showMenu: false}
        this.href = `${this.props.trip.props.href}/participants/${this.props.participant.id}`
        this.app = this.props.app
        this.setDeleted = this.setDeleted.bind(this)
        this.toggleWaitlist = this.toggleWaitlist.bind(this)
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

    public saveParticipant(body: any): Promise<void> {
        return this.app.triphubApiCall('POST', this.href as string, body, true);
    }

    public setDeleted() {
        this.setState({isSaveOp:true})
        this.props.owner.setParticipant(this.props.participant.id, {isDeleted: !this.props.participant.isDeleted}).then(
            () => this.setState({isSaveOp:false})
        )
    }

    public toggleWaitlist() {
        this.setState({isMemberOp:true})
        this.props.owner.setPosition(this.props.participant.id).then(
            () => this.setState({isMemberOp:false})
        )
    }

    public setMember() {
        const member = this.props.app.getMemberById(this.props.participant.memberId)
        const emergencyContactName = this.props.participant.emergencyContactName
        const emergencyContactPhone = this.props.participant.emergencyContactPhone

        if (confirm(`Are you sure you want to update the contact details for ${member.name} ?`)) {
            this.setState({isMemberOp:true})
            this.props.app.triphubApiCall('POST', 
                    `${this.props.trip.props.href}/members/${member.id}`,
                    {emergencyContactName, emergencyContactPhone}, false)
                .then(() => {
                    this.props.app.requeryMembers()
                    this.setState({isMemberOp:false})
                })
        }
    }

    public render() {
        const participants = this.props.trip.state.participants
        const validations: IValidation[] = this.app.validateParticipant(participants.find((p:IParticipant) => p.id === this.props.participant.id) as IParticipant);

        const participant = this.props.participant
        const member = this.props.app.getMemberById(participant.memberId)
        const canEdit = this.props.trip.canEditTrip() || this.props.app.getMe().id === participant.memberId
        const canEditLeader = this.props.app.state.role >= Role.Admin
        const isMemberDiff = participant.memberId === this.props.app.getMe().id &&
                             participant.memberId && (participant.emergencyContactName !== member.emergencyContactName ||
                                                      participant.emergencyContactPhone !== member.emergencyContactPhone)

        const onGet = (id: string): any => {
            return this.get(id);
        }
        const onSave = (id: string, value: any): Promise<void> => {
            this.set(id, value);
            const body = {};
            body[id] = value;
            return this.saveParticipant(body);
        }
        const onGetValidationMessage = (id: string): any => {
            const found: IValidation | undefined = validations.find(v => v.id === id && !v.ok);
            return found ? found.message : null;
        }
        const common = {
            readOnly: !canEdit,
            isLoading: this.props.loading,
            'onGet': onGet,
            'onSave': onSave,
            'onGetValidationMessage': onGetValidationMessage
        }

        const iconid = `${participant.id || 'new'}`
        const logisticInfo = (participant.logisticInfo || '').trim()
        const validation = this.app.validateParticipant(participant).filter(v => !v.ok).map(v => v.message)
        const moveableIndex = this.props.info.moveable.map(m => m.id).indexOf(participant.id)
        const canMoveUp = moveableIndex > 0
        const canMoveDown = moveableIndex >= 0 && moveableIndex+1 < this.props.info.moveable.length
        const onDragStart = (ev:any) => ev.dataTransfer.setData('id', participant.id)
        const onDragOver = (ev:any) => ev.preventDefault()
        const onDrop = (ev:any) => this.props.owner.setPosition(parseInt(ev.dataTransfer.getData('id'),10), participant)
        const onMoveUp = () => this.props.owner.setPosition(participant.id,this.props.info.moveable[moveableIndex-1],true)
        const onMoveDown = () => this.props.owner.setPosition(participant.id,this.props.info.moveable[moveableIndex+1],true)


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
            canMoveUp && canEdit ?
                <ButtonWithTooltip key='moveup' id={'moveup' + participant.id} onClick={onMoveUp} tooltipText="Move up">
                    <span className='fa fa-sm fa-angle-up'/>
                </ButtonWithTooltip> : null,
            canMoveDown && canEdit ?
                <ButtonWithTooltip key='movedown' id={'movedown' + participant.id} onClick={onMoveDown} tooltipText="Move down">
                    <span className='fa fa-angle-down'/>
                </ButtonWithTooltip> : null,
            !participant.isDeleted && participant.id > 0 && canEdit ? 
                <ButtonWithTooltip key='delete' id={'delete' + participant.id} onClick={this.setDeleted} tooltipText="Delete">
                    <span className='fa fa-trash'/> 
                    {this.state.isSaveOp ? ['Deleting ', Spinner] : ''}
                </ButtonWithTooltip> : null,
            participant.isDeleted && participant.id > 0 && canEdit ? 
                <ButtonWithTooltip key='undelete' id={'undelete' + participant.id} onClick={this.setDeleted} tooltipText="Sign back up">
                    <span className='fa fa-sm fa-pen'/> 
                    {this.state.isSaveOp ? ['Signing up ', Spinner] : ''}
                </ButtonWithTooltip> : null,
            this.props.canWaitList && this.props.trip.canEditTrip() ? 
                <ButtonWithTooltip key='waitlist' id={'waitlist' + participant.id} onClick={this.toggleWaitlist} tooltipText="Add to wait list">
                    <span className='fa fa-sm fa-user-plus'/> 
                    {this.state.isWaitlistOp ? ['Adding ', Spinner] : ''}
                </ButtonWithTooltip> : null,
            this.props.canUnwaitList && this.props.trip.canEditTrip() ? 
                <ButtonWithTooltip key='unwaitlist' id={'unwaitlist' + participant.id} onClick={this.toggleWaitlist} tooltipText="Remove from wait list">
                    <span className='fa fa-sm fa-user-times'/> 
                    {this.state.isWaitlistOp ? ['Removing ', Spinner] : ''}
                </ButtonWithTooltip> : null,
            isMemberDiff ?
                <ButtonWithTooltip key='ecdupdate' id={'ecdupdate' + participant.id} onClick={this.setMember} tooltipText="Update emergency contact details">
                    <span className='fa fa-sm fa-phone'/> 
                    {this.state.isMemberOp ? ['Updating ', Spinner] : ''}
                </ButtonWithTooltip> : null,
        ]

        return (  
            <div onDrop={participant.isDeleted ? this.props.owner.onDropOnDeleted : onDrop} 
                 onDragOver={onDragOver} onDragStart={onDragStart} draggable={!participant.isLeader}>

                <Accordian id={`${participant.id}`}  className='participant' headerClassName='participant-header' expanded={participant.id === -1} 
                    title={<span>{title}
                               <ButtonGroup className='participant-buttons'>
                                   {buttons}
                               </ButtonGroup>
                          </span>
                    }>
                    <Form key='form' className='indentedparticipants form'>
                       <Container className={this.props.app.containerClassName()} fluid={true}>
    
                            <Row>
                                <Col sm={4}>
                                    <InputControl id='name' label='Name' type='text' list='memberlist' {...common} /> 
                                </Col>
                                <Col sm={4}>
                                    <InputControl id='email' label='Email' type='text' {...common}/>
                                </Col>
                                <Col sm={4}>
                                    <InputControl id='phone' label='Phone' type='text' {...common}/>
                                </Col>
                            </Row>

                            <Row>
                                <Col sm={4}>
                                    <InputControl id='emergencyContactName' label='Emergency Contact Name' type='text' {...common}/>
                                </Col>
                                <Col sm={4}>
                                    <InputControl id='emergencyContactPhone' label='Emergency Contact Phone' type='text' {...common}/>
                                </Col>
                            </Row>

                            <Row>
                                <Col sm={3}>
                                    <SwitchControl id='isLeader' label='Leader' {...{...common, readOnly:!canEditLeader}}/>
                                </Col>
                                <Col sm={3}>
                                    <SwitchControl id='isPlbProvider' label='Bringing PLB' {...common}/>
                                </Col>
                                <Col sm={3}>
                                    <SwitchControl id='isVehicleProvider' label='Bringing Car' {...common}/>
                                </Col>
                                <Col sm={3}>
                                    <InputControl id='vehicleRego' label='Rego' type='text' hidden={!participant.isVehicleProvider} {...common}/>
                                </Col>
                            </Row>
                            
                            <Row>
                                <Col>
                                    <TextAreaInputControl id='logisticInfo' label='Logistic Information' {...common}/>
                                </Col>
                            </Row>
 
                        </Container>
                    </Form>
                </Accordian>
            </div>
        )
    }
}
