import * as React from 'react'
import { Form, Row, Col, Container, ButtonGroup } from 'reactstrap'
import { Component } from 'react'
import { IMember, IParticipant, IValidation, IParticipantsInfo, Role } from './Interfaces'
import { Spinner } from './Widgets'
import { Trip } from './Trip'
import { App } from './App'
import { InputControl, SelectControl, SwitchControl, TextAreaInputControl } from './Control'
import { ToolTipIcon } from './ToolTipIcon'
import { TripParticipants } from './TripParticipants'
import { Accordian } from './Accordian'
import { BindMethods } from './Utilities'
import { ButtonWithTooltip } from './ButtonWithTooltip'

export class TripParticipant extends Component<{
    participantId: number
    trip: Trip
    owner: TripParticipants
    app: App
    canWaitList?: boolean
    canUnwaitList?: boolean
    info: IParticipantsInfo
    data: string
}, {
    id?: string
    isSaveOp?: boolean
    isWaitlistOp?: boolean
    isMemberOp?: boolean
    showMenu: boolean
    newTramper: string
}> {

    public href?: string
    public app: App

    constructor(props: any) {
        super(props)

        this.href = `${this.props.trip.props.href}/participants/${this.props.participantId}`
        this.app = this.props.app
        this.state = { showMenu: false, newTramper: '' }
        BindMethods(this)
    }

    get participant() {
        const participants = this.props.trip.state.participants
        return participants.find((p: IParticipant) => p.id === this.props.participantId) as IParticipant
    }


    public set(data: { [id: string]: any }): any {
        const participants = [...this.props.trip.state.participants]
        const index = participants.findIndex(p => p.id === this.props.participantId)
        const participant = { ...participants[index], ...data }

        participants[index] = participant

        this.props.trip.setState({ participants })
    }

    public save(body: { [id: string]: any }): Promise<void> {
        return this.app.triphubApiCall('POST', this.href as string, body, true)
    }

    public onDeleted() {
        this.setState({ isSaveOp: true })
        this.props.owner.onSetParticipant(this.props.participantId, { isDeleted: !this.participant.isDeleted })
            .then(() => this.setState({ isSaveOp: false }))
    }

    public onToggleWaitlist() {
        this.setState({ isMemberOp: true })
        this.props.owner.onSetPosition(this.props.participantId)
            .then(() => this.setState({ isMemberOp: false }))
    }

    public onSetMember() {
        const participant = this.participant
        const member = this.props.app.getMemberById(participant.memberId)
        const emergencyContactName = participant.emergencyContactName
        const emergencyContactPhone = participant.emergencyContactPhone

        if (confirm(`Are you sure you want to update the contact details for ${member.name} ?`)) {
            this.setState({ isMemberOp: true })
            this.props.app.triphubApiCall('POST',
                `${this.props.trip.props.href}/members/${member.id}`,
                { emergencyContactName, emergencyContactPhone }, false)
                .then(() => {
                    this.props.app.requeryMembers()
                    this.setState({ isMemberOp: false })
                })
        }
    }

    public render() {
        const participant = this.participant
        const participants = this.props.trip.state.participants
        const participantActual = { ...participant, name: participant.name || this.state.newTramper }
        const validations: IValidation[] = this.app.validateParticipant(participantActual, participants)
        const canEdit = this.props.trip.canEditTrip || this.props.app.me.id === participant.memberId
        const canEditAsLeader = this.props.app.state.role >= Role.TripLeader
        const member = this.props.app.getMemberById(participant.memberId)
        const isMemberDiff = participant.memberId === this.props.app.me.id && participant.memberId && (
            participant.emergencyContactName !== member.emergencyContactName ||
            participant.emergencyContactPhone !== member.emergencyContactPhone)
        const existing = new Set(participants.filter(p => p.id !== participant.id).map(p => p.name))
        const members = this.props.app.members.filter(m => !existing.has(m.name) || m.name === participant.name)
        const nameOptions = {
            'New Tramper': ['New Tramper'],
            'Members': members.filter(m => m.isMember).map(m => m.name),
            'Non-Members': members.filter(m => !m.isMember).map(m => m.name)
        }

        const onGet = (field: string): any => participant[field]
        const onGetName = (_: string): any =>
            this.props.app.getMemberByName(participant.name) ? participant.name : 'New Tramper'
        const onGetNewTramper = (_: string): any => this.state.newTramper
        const onSet = (field: string, value: any) => this.set({ [field]: value })
        const onSetNewTramper = (_: string, value: any) => this.setState({ newTramper: value })
        const onSave = (field: string, value: any): Promise<void> => {
            this.set({ [field]: value })
            return this.save({ [field]: value })
        }
        const onSaveName = (_: string, value: any): Promise<void> => {
            const lookup: any = this.props.app.getMemberByName(value) || {}
            const body = {
                name: value === 'New Tramper' ? '' : value,
                memberId: lookup.id || 0,
                email: lookup.email || '',
                phone: lookup.phone || '',
                emergencyContactName: lookup.emergencyContactName || '',
                emergencyContactPhone: lookup.emergencyContactPhone || '',
            }

            this.set(body)
            return this.save(body)
        }
        const onSaveNewTramper = (_: string, value: any): Promise<void> => {
            return (this.props.app.getMemberByName(value) ? onSaveName : onSave)('name', value)
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
        const moveableIndex = this.props.info.moveable.map(m => m.id).indexOf(participant.id)
        const canMoveUp = moveableIndex > 0
        const canMoveDown = moveableIndex >= 0 && moveableIndex + 1 < this.props.info.moveable.length
        const onDragStart = (ev: any) => ev.dataTransfer.setData('id', participant.id)
        const onDragOver = (ev: any) => ev.preventDefault()
        const onDrop = (ev: any) => this.props.owner.onSetPosition(parseInt(ev.dataTransfer.getData('id'), 10), participant)
        const onMoveUp = () => this.props.owner.onSetPosition(participant.id, this.props.info.moveable[moveableIndex - 1], true)
        const onMoveDown = () => this.props.owner.onSetPosition(participant.id, this.props.info.moveable[moveableIndex + 1], true)

        const title = [
            <span key='title'>{[participant.name, this.state.newTramper, 'New Tramper'].find(n => n !== '')} </span>,
            validations.length &&
            <ToolTipIcon key='warning' icon='warning' tooltip={validations.map(v => v.message).join(', ')} className='warning-icon' id={iconid} />,
            participant.isLeader &&
            <ToolTipIcon key='leader' icon='star' tooltip={`${participant.name} is the leader`} id={iconid} />,
            participant.isPlbProvider &&
            <ToolTipIcon key='plb' icon='podcast' tooltip={`${participant.name} is bringing a PLB`} id={iconid} />,
            participant.isVehicleProvider &&
            <ToolTipIcon key='car' icon='car' tooltip={`${participant.name} is bringing a Car`} id={iconid} />,
            logisticInfo &&
            <ToolTipIcon key='logisticInfo' icon='comment' tooltip={logisticInfo} id={iconid} />,
            !participant.memberId &&
            <ToolTipIcon key='nonmember' icon='id-badge' tooltip={`${participant.name} is not a member of the CTC`} id={iconid} />,
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
            <ButtonWithTooltip key='delete' id={'delete' + participant.id} onClick={this.onDeleted} tooltipText="Delete">
                <span className='fa fa-trash' />
                {this.state.isSaveOp ? ['Deleting ', Spinner] : ''}
            </ButtonWithTooltip>,
            participant.isDeleted && participant.id > 0 && canEdit &&
            <ButtonWithTooltip key='undelete' id={'undelete' + participant.id} onClick={this.onDeleted} tooltipText="Sign back up">
                <span className='fa fa-sm fa-pen' />
                {this.state.isSaveOp ? ['Signing up ', Spinner] : ''}
            </ButtonWithTooltip>,
            this.props.canWaitList && this.props.trip.canEditTrip &&
            <ButtonWithTooltip key='waitlist' id={'waitlist' + participant.id} onClick={this.onToggleWaitlist} tooltipText="Add to wait list">
                <span className='fa fa-sm fa-user-plus' />
                {this.state.isWaitlistOp ? ['Adding ', Spinner] : ''}
            </ButtonWithTooltip>,
            this.props.canUnwaitList && this.props.trip.canEditTrip &&
            <ButtonWithTooltip key='unwaitlist' id={'unwaitlist' + participant.id} onClick={this.onToggleWaitlist} tooltipText="Remove from wait list">
                <span className='fa fa-sm fa-user-times' />
                {this.state.isWaitlistOp ? ['Removing ', Spinner] : ''}
            </ButtonWithTooltip>,
            isMemberDiff &&
            <ButtonWithTooltip key='ecdupdate' id={'ecdupdate' + participant.id} onClick={this.onSetMember} tooltipText="Update emergency contact details">
                <span className='fa fa-sm fa-phone' />
                {this.state.isMemberOp ? ['Updating ', Spinner] : ''}
            </ButtonWithTooltip>,
        ].filter(e => e)
        const buttonGroup = <ButtonGroup className='participant-buttons'>{buttons}</ButtonGroup>

        return (
            <div onDrop={participant.isDeleted ? this.props.owner.onDropOnDeleted : onDrop}
                onDragOver={onDragOver} onDragStart={onDragStart} draggable={!participant.isLeader}>

                <Accordian id={`${participant.id}`} className='participant'
                    headerClassName='participant-header' expanded={participant.id === -1}
                    title={<span>{title}{buttonGroup}</span>}>
                    <Form key='form' className='indentedparticipants form'>
                        <Container key='container' className={this.props.app.containerClassName} fluid={true}>
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
                                this.props.app.getMemberByName(participant.name) ? null :
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
                                <Col sm={3}>
                                    <SwitchControl field='isVehicleProvider' label='Bringing Car' {...common} />
                                </Col>
                                <Col sm={3}>
                                    <InputControl field='vehicleRego' label='Rego' type='text' hidden={!participant.isVehicleProvider} {...common} />
                                </Col>
                            </Row>

                            <Row key='5'>
                                <Col>
                                    <TextAreaInputControl field='logisticInfo' label='Logistic Information' {...common} />
                                </Col>
                            </Row>

                        </Container>
                    </Form>
                </Accordian>
            </div>
        )
    }
}
