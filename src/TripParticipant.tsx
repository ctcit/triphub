import { Form, Row, Col, Container, ButtonGroup } from 'reactstrap'
import { Component } from 'react'
import { IParticipant, IValidation, IParticipantsInfo, Role, ITrip } from './Interfaces'
import { Spinner } from './Widgets'
import { InputControl, InputWithSelectControl, SelectControl, SwitchControl, TextAreaInputControl } from './Control'
import { ToolTipIcon } from './ToolTipIcon'
import { Accordian } from './Accordian'
import { BindMethods } from './Utilities'
import { ButtonWithTooltip } from './ButtonWithTooltip'
import { MembersService } from './Services/MembersService'
import { TripsService } from './Services/TripsService'
import { ConfigService } from './Services/ConfigService'

export class TripParticipant extends Component<{
    participant: IParticipant
    trip: ITrip
    role: Role,
    isOnline: boolean,
    canEditTrip: boolean,
    canWaitList?: boolean
    canUnwaitList?: boolean
    participants: IParticipant[]
    participantsInfo: IParticipantsInfo
    setParticipant(id: number, data: { [id: string]: any }, save: boolean): Promise<IParticipant>
    setPosition(id: number, target?: IParticipant): Promise<any>
}, {
    id?: string
    isSaveOp?: boolean
    isWaitlistOp?: boolean
    isMemberOp?: boolean
    newTramper: string
}> {

    constructor(props: any) {
        super(props)

        this.state = { newTramper: '' }
        BindMethods(this)
    }

    public onDeleted() {
        this.setState({ isSaveOp: true })
        this.props.setParticipant(this.props.participant.id, { isDeleted: !this.props.participant.isDeleted }, true)
            .then(() => this.setState({ isSaveOp: false }))
    }

    public onToggleWaitlist() {
        this.setState({ isMemberOp: true })
        this.props.setPosition(this.props.participant.id)
            .then(() => this.setState({ isMemberOp: false }))
    }

    public onSetMember() {
        const participant = this.props.participant
        const member = MembersService.getMemberById(participant.memberId)
        const emergencyContactName = participant.emergencyContactName
        const emergencyContactPhone = participant.emergencyContactPhone

        if (confirm(`Are you sure you want to update the contact details for ${member.name} ?`)) {
            this.setState({ isMemberOp: true })
            MembersService.postMemberUpdate(member.id, { emergencyContactName, emergencyContactPhone })
                .then(() => {
                    MembersService.getMembers(true)
                    this.setState({ isMemberOp: false })
                })
        }
    }

    public render() {
        const participant = this.props.participant
        const participants = this.props.participants
        const participantActual = { ...participant, name: participant.name || this.state.newTramper }
        const validations: IValidation[] = TripsService.validateParticipant(participantActual, participants)
        const warnings = validations.filter(i => !i.ok)
        const canEdit = this.props.canEditTrip || MembersService.Me.id === participant.memberId
        const canEditAsLeader = this.props.role >= Role.TripLeader
        const member = MembersService.getMemberById(participant.memberId)
        const isMemberDiff = participant.memberId === MembersService.Me.id && participant.memberId && (
            participant.emergencyContactName !== member.emergencyContactName ||
            participant.emergencyContactPhone !== member.emergencyContactPhone)
        const existing = new Set(participants.filter(p => p.id !== participant.id).map(p => p.name))
        const members = MembersService.Members.filter(m => !existing.has(m.name) || m.name === participant.name)
        const nameOptions = {
            'New Tramper': ['New Tramper'],
            'Members': members.filter(m => m.isMember && m.membershipType !== 'Junior').map(m => m.name),
            'Junior Members': members.filter(m => m.isMember && m.membershipType === 'Junior').map(m => m.name),
            'Non-Members': members.filter(m => !m.isMember).map(m => m.name)
        }

        const onGet = (field: string): any => participant[field]
        const onGetName = (_: string): any => MembersService.getMemberByName(participant.name) ? participant.name : 'New Tramper'
        const onGetNewTramper = (_: string): any => this.state.newTramper
        const onSet = (field: string, value: any): Promise<IParticipant> => this.props.setParticipant(participant.id, { [field]: value }, false)
        const onSetNewTramper = (_: string, value: any) => this.setState({ newTramper: value })
        const onSave = (field: string, value: any): Promise<IParticipant> => this.props.setParticipant(participant.id, { [field]: value }, true)
        
        const onSaveName = (_: string, value: any): Promise<IParticipant> => {
            const lookup: any = MembersService.getMemberByName(value) || {}
            const body = {
                name: value === 'New Tramper' ? '' : value,
                memberId: lookup.id || 0,
                email: lookup.email || '',
                phone: lookup.phone || '',
                emergencyContactName: lookup.emergencyContactName || '',
                emergencyContactPhone: lookup.emergencyContactPhone || '',
            }
            return this.props.setParticipant(participant.id, body, true)
        }
        const onSaveNewTramper = (_: string, value: any): Promise<IParticipant> => {
            return (MembersService.getMemberByName(value) ? onSaveName : onSave)('name', value)
        }
        const onSaveIsVehicleProvider = (field: string, value: any): Promise<IParticipant> => {
            return onSave(field, value).then(() => onSave('broughtVehicle', value))
        }

        const onGetValidationMessage = (field: string): any => {
            return (validations.find(v => v.field === field && !v.ok) || {} as any).message
        }

        const common = {
            id: `${participant.id}`,
            readOnly: !canEdit,
            data: JSON.stringify(participant),
            noSaveBadge: participant.id === -1,
            onGet,
            onSet,
            onSave,
            onGetValidationMessage
        }

        const iconid = `${participant.id || 'new'}`
        const logisticInfo = (participant.logisticInfo || '').trim()
        const moveableIndex = this.props.participantsInfo.moveable.map(m => m.id).indexOf(participant.id)
        const canMoveUp = moveableIndex > 0
        const canMoveDown = moveableIndex >= 0 && moveableIndex + 1 < this.props.participantsInfo.moveable.length
        const onDragStart = (ev: any) => ev.dataTransfer.setData('id', participant.id)
        const onDragOver = (ev: any) => ev.preventDefault()
        const onDrop = (ev: any) => this.props.setPosition(parseInt(ev.dataTransfer.getData('id'), 10), participant)
        const onDropOnDeleted = (ev: any) => this.props.setParticipant(parseInt(ev.dataTransfer.getData('id'), 10), { isDeleted: true }, true)
        const onMoveUp = () => this.props.setPosition(participant.id, this.props.participantsInfo.moveable[moveableIndex - 1])
        const onMoveDown = () => this.props.setPosition(participant.id, this.props.participantsInfo.moveable[moveableIndex + 1])
        const onDeleted = () => this.onDeleted();
        const onToggleWaitlist = () => this.onToggleWaitlist();
        const onSetMember = () => this.onSetMember();

        const title = [
            <span key='title'>{[participant.name, this.state.newTramper, 'New Tramper'].find(n => n !== '')} </span>,
            warnings.length &&
            <ToolTipIcon key='warning' icon='warning' tooltip={warnings.map(v => v.message).join(', ')} className='warning-icon' id={iconid} />,
            participant.isLeader &&
            <ToolTipIcon key='leader' icon='star' tooltip={`${participant.name} is the leader`} id={iconid} />,
            participant.isPlbProvider &&
            <ToolTipIcon key='plb' icon='podcast' tooltip={`${participant.name} is bringing a PLB`} id={iconid} />,
            participant.isVehicleProvider &&
            <ToolTipIcon key='car' icon='car' tooltip={`${participant.name} can bring a car`} id={iconid} />,
            participant.isVehicleProvider && participant.seats &&
            <span key='count' className='TripCount'>{` (${participant.seats} seats)`}</span>,
            participant.isAvalancheGearProvider &&
            <ToolTipIcon key='avalancheGear' icon='snowflake' tooltip={`${participant.name} is bringing Avalanche Gear`} id={iconid} />,
            logisticInfo &&
            <ToolTipIcon key='logisticInfo' icon='comment' tooltip={logisticInfo} id={iconid} />,
            !participant.memberId &&
            <ToolTipIcon key='nonmember' icon='id-badge' tooltip={`${participant.name} is not a member of the CTC`} id={iconid} />,
            MembersService.getMemberByName(participant.name)?.membershipType === 'Junior' &&
            <ToolTipIcon key='junior' icon='child' tooltip={`${participant.name} is a junior member of the CTC`} id={iconid} />,
        ].filter(e => e)
        const buttons = [
            canMoveUp && canEdit &&
            <ButtonWithTooltip key='moveup' id={'moveup' + participant.id} onClick={onMoveUp} tooltipText="Move up">
                <span className='fa fa-sm fa-angle-up' />
            </ButtonWithTooltip>,
            canMoveDown && canEdit &&
            <ButtonWithTooltip key='movedown' id={'movedown' + participant.id} onClick={onMoveDown} tooltipText="Move down">
                <span className='fa fa-angle-down' />
            </ButtonWithTooltip>,
            !participant.isDeleted && participant.id > 0 && canEdit &&
            <ButtonWithTooltip key='delete' id={'delete' + participant.id} onClick={onDeleted} tooltipText="Delete">
                <span className='fa fa-trash' />
                {this.state.isSaveOp ? ['Deleting ', Spinner] : ''}
            </ButtonWithTooltip>,
            participant.isDeleted && participant.id > 0 && canEdit &&
            <ButtonWithTooltip key='undelete' id={'undelete' + participant.id} onClick={onDeleted} tooltipText="Sign back up">
                <span className='fa fa-sm fa-pen' />
                {this.state.isSaveOp ? ['Signing up ', Spinner] : ''}
            </ButtonWithTooltip>,
            this.props.canWaitList && this.props.canEditTrip &&
            <ButtonWithTooltip key='waitlist' id={'waitlist' + participant.id} onClick={onToggleWaitlist} tooltipText="Add to wait list">
                <span className='fa fa-sm fa-user-plus' />
                {this.state.isWaitlistOp ? ['Adding ', Spinner] : ''}
            </ButtonWithTooltip>,
            this.props.canUnwaitList && this.props.canEditTrip &&
            <ButtonWithTooltip key='unwaitlist' id={'unwaitlist' + participant.id} onClick={onToggleWaitlist} tooltipText="Remove from wait list">
                <span className='fa fa-sm fa-user-times' />
                {this.state.isWaitlistOp ? ['Removing ', Spinner] : ''}
            </ButtonWithTooltip>,
            isMemberDiff && this.props.isOnline &&
            <ButtonWithTooltip key='ecdupdate' id={'ecdupdate' + participant.id} onClick={onSetMember} tooltipText="Update emergency contact details">
                <span className='fa fa-sm fa-phone' />
                {this.state.isMemberOp ? ['Updating ', Spinner] : ''}
            </ButtonWithTooltip>,
        ].filter(e => e)
        const buttonGroup = <ButtonGroup className='participant-buttons'>{buttons}</ButtonGroup>

        return (
            <div onDrop={participant.isDeleted ? onDropOnDeleted : onDrop}
                onDragOver={onDragOver} onDragStart={onDragStart} draggable={!participant.isLeader}>

                <Accordian id={`${participant.id}`} className='participant'
                    headerClassName='participant-header' expanded={participant.id === -1}
                    title={<span>{title}{buttonGroup}</span>}>
                    <Form key='form' className='indentedparticipants form'>
                        <Container key='container' className={ConfigService.containerClassName} fluid={true}>
                            <Row key='1'>
                                <Col sm={4}>
                                    <SelectControl field='name' label='Name' options={nameOptions}
                                        {...common} onGet={onGetName} onSave={onSaveName} />
                                </Col>
                                <Col sm={4}>
                                    <InputControl field='email' label='Email' type='text' {...common} />
                                </Col>
                                <Col sm={4}>
                                    <InputControl field='phone' label='Phone' type='text' {...common} />
                                </Col>
                            </Row>

                            {
                                MembersService.getMemberByName(participant.name) ? null :
                                    <Row key='2'>
                                        <Col sm={4}>
                                            <InputControl autoFocus={true} field='New Tramper' label="New Tramper's Name" type='text'
                                                {...common}
                                                onGet={onGetNewTramper} onSet={onSetNewTramper} onSave={onSaveNewTramper} />
                                        </Col>
                                    </Row>
                            }

                            <Row key='3'>
                                <Col sm={4}>
                                    <InputControl field='emergencyContactName' label='Emergency Contact Name' type='text' {...common} />
                                </Col>
                                <Col sm={4}>
                                    <InputControl field='emergencyContactPhone' label='Emergency Contact Phone' type='text' {...common} />
                                </Col>
                            </Row>

                            <Row key='4'>
                                <Col sm={3}>
                                    <SwitchControl field='isLeader' label='Leader' {...{ ...common, readOnly: !canEditAsLeader }} />
                                </Col>
                                <Col sm={3}>
                                    <SwitchControl field='isPlbProvider' label='Bringing PLB' {...common} />
                                </Col>
                                {(participant.isAvalancheGearProvider || new Set((this.props.trip.prerequisites ?? '').split(',')).has('Avalanche Gear')) &&
                                    <Col sm={3}>
                                        <SwitchControl field='isAvalancheGearProvider' label='Bringing Avalanche Gear' {...common} />
                                    </Col>
                                }
                                <Col sm={3}>
                                    <SwitchControl field='isVehicleProvider' label='Bringing Car' {...common} onSave={onSaveIsVehicleProvider} />
                                </Col>
                            </Row>

                            {
                                participant.isVehicleProvider &&
                                <Row>
                                    <Col sm={3}>
                                        <InputControl field='vehicleRego' label='Rego' type='text' hidden={!participant.isVehicleProvider} {...common} />
                                    </Col>
                                    <Col sm={3}>
                                        <InputControl field='seats' label='Seats (including driver)' 
                                        type="number" min={0} max={50} step={1}
                                        {...common} />
                                    </Col>
                                    <Col sm={2} md={3}>
                                        <SwitchControl field='isFixedCostVehicle' label='Fixed cost vehicle (e.g. company)' {...common} />
                                    </Col>
                                    {
                                        !participant.isFixedCostVehicle &&
                                        <Col sm={3}>
                                            <InputWithSelectControl field='engineSize' label='Engine Size (cc), EV=0' 
                                            type="number" min={0} max={10000} step={100}
                                            options={[0,1300,1500,1600,1800,2000,2500,3000]} {...common} />
                                        </Col>
                                    }
                                    {
                                        participant.isFixedCostVehicle &&
                                        <Col sm={3}>
                                            <InputControl field='vehicleCost' label='Vehicle Cost ($)' 
                                            type='number' {...common} />
                                        </Col>
                                    }
                                </Row>
                            }

                            <Row key='5'>
                                <Col>
                                    <TextAreaInputControl field='logisticInfo' label='Logistic Information' {...common} />
                                </Col>
                            </Row>

                        </Container>
                    </Form>
                </Accordian>
            </div >
        )
    }
}
