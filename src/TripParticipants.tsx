import * as React from 'react';
import { Button, Navbar, ButtonGroup, ListGroup, ListGroupItem } from 'reactstrap';
import { Component } from 'react';
import { IMember, IParticipant } from './Interfaces';
import { Spinner } from './Widgets';
import { Trip } from './Trip';
import { App } from './App';
import { GetDisplayPriority } from './Utilities';
import { TripParticipant } from './TripParticipant';
import { ButtonWithTooltip } from './MapEditor';

export class TripParticipants extends Component<{
    trip: Trip,
    app: App,
    isLoading: boolean
}, {
    namePrefix?: string
}> {

    public participant: React.RefObject<any>

    constructor(props: any) {
        super(props)
        this.state = {}
        this.signMeUp = this.signMeUp.bind(this)
        this.signUpTramper = this.signUpTramper.bind(this)
        this.signUpTramperSave = this.signUpTramperSave.bind(this)
        this.signUpTramperCancel = this.signUpTramperCancel.bind(this)
        this.toggleLegend = this.toggleLegend.bind(this)
        this.setPosition = this.setPosition.bind(this)
        this.setParticipant = this.setParticipant.bind(this)
        this.onDropOnDeleted = this.onDropOnDeleted.bind(this)
        this.participant = React.createRef()
    }

    public signUpTramper() {
        const participants = this.props.trip.state.participants

        this.props.trip.setState({ participants: [this.props.trip.blankTramper(), ...participants] })
    }

    public signMeUp() {

        if (!this.props.app.getMe().id) {
            const newMembersRep = this.props.app.state.members[0]
            alert(`Non members are most welcome to join club trips.\n` +
                `Please either:\n` +
                `• Get to meet us at our weekly meetings at\n` +
                `     Canterbury Mineral and Lapidary Club rooms,\n` +
                `     110 Waltham Rd, Waltham; or\n` +
                `• Contact ${newMembersRep.name} via the via the prospective members form`)
            return
        }

        this.props.trip.setState({ isSaving: true })
        this.props.app.triphubApiCall('POST', this.props.trip.props.href + '/participants', this.props.trip.signMeUpTramper(), true)
            .then(this.props.trip.requeryParticipants)
    }

    public signUpTramperSave() {
        const participant = this.props.trip.state.participants[0]

        this.props.trip.setState({ isSaving: true })
        this.props.app.triphubApiCall('POST', this.props.trip.props.href + '/participants', participant, true)
            .then(this.props.trip.requeryParticipants)
    }

    public signUpTramperCancel() {
        this.props.trip.setState({ participants: this.props.trip.state.participants.filter((p: any) => p.id !== -1) })
    }

    public toggleLegend() {
        this.props.trip.setState({ showLegend: !this.props.trip.state.showLegend })
    }

    public setPosition(id: number, target?: IParticipant, showMenu?: boolean): Promise<any> {
        const info = this.props.trip.getParticipantsInfo()
        const source = info.all.find(p => p.id === id) as IParticipant
        const sourceIndex = info.moveable.indexOf(source)
        let displayPriority = source.id

        if (info.moveable.length) {
            if (!target) {
                // If the target is not specified assume this is a toggle to/from the waitlist,
                // or to the end of the list if the participant is deleted
                const maxParticipantsExcludingLeader = info.maxParticipants - 1
                const endOfListIndex = info.moveable.length - 1
                const firstWaitListIndex = info.maxParticipants - 1
                const notOnWaitlist = sourceIndex < maxParticipantsExcludingLeader
                const toIndex = source.isDeleted ? endOfListIndex : firstWaitListIndex + (notOnWaitlist ? 0 : -1)
                target = info.moveable[toIndex]
            }

            const targetIndex = info.moveable.indexOf(target)
            const nextIndex = sourceIndex < targetIndex || source.isDeleted ? targetIndex + 1 : targetIndex - 1

            displayPriority = nextIndex < 0
                ? GetDisplayPriority(target) - 1
                : nextIndex >= info.moveable.length
                    ? GetDisplayPriority(target) + 1
                    : GetDisplayPriority(target) / 2 + GetDisplayPriority(info.moveable[nextIndex]) / 2
        }

        return this.setParticipant(id, { isDeleted: false, displayPriority: displayPriority.toString() }, showMenu)
    }

    public setParticipant(id: number, props: {}, showMenu?: boolean): Promise<any> {

        const participants = [...this.props.trip.state.participants]
        const participant = participants.find((p: IParticipant) => p.id === id) as IParticipant
        const index = participants.indexOf(participant)

        participants[index] = { ...participant, ...props, showMenu }

        this.props.trip.setState({ participants })
        return this.props.app.triphubApiCall('POST', `${this.props.trip.props.href}/participants/${id}`, props, true)
    }

    public onDropOnDeleted(ev: any) {
        this.setParticipant(parseInt(ev.dataTransfer.getData('id'), 10), { isDeleted: true })
    }

    public render() {

        const me = this.props.app.getMe()
        const anon = !me.id
        const info = this.props.trip.getParticipantsInfo()
        const isPrivileged = this.props.trip.canEditTrip()
        const isOpen = this.props.trip.state.trip.isOpen || isPrivileged
        const isNewTrip = this.props.trip.props.isNew
        const hasNewTramper = !!info.all.find((p: IParticipant) => p.id === -1)
        const imOnList = !!info.all.find((m: IParticipant) => m.memberId === me.id)
        const onDragOver = (ev: any) => ev.preventDefault()
        const onDropOnWaitlist = (ev: any) => this.setPosition(parseInt(ev.dataTransfer.getData('id'), 10), undefined)
        const showLegend = this.props.trip.state.showLegend
        const legendIcon = (className: string, description: string) =>
            <div><span className={className}/>{description}</div>
        const legendButton = (className: string, description: string) =>
            <div><Button disabled={true}><span className={className}/></Button>{description}</div>

        return [
            <Navbar key='navbar' color='light' light={true} expand='md'>
                {[
                    <Button key={'signmeup' + info.all.length} onClick={this.signMeUp} hidden={this.props.isLoading || isNewTrip || imOnList || !isOpen}>
                        <span className='fa fa-pen wiggle' />
                        {this.props.trip.state.isSaving ? ['Signing up ', Spinner] : 'Sign me up!'}
                        {info.current.length >= info.maxParticipants ? " (on waitlist)" : ""}
                    </Button>,
                    <Button key={'signup' + info.all.length} onClick={this.signUpTramper} hidden={this.props.isLoading || isNewTrip || hasNewTramper || !isOpen || anon || !isPrivileged}>
                        <span className='fa fa-user-plus' /> Sign up a tramper
                    {info.current.length >= info.maxParticipants ? " (on waitlist)" : ""}
                    </Button>,
                    <ButtonGroup key={'signupcomplete' + info.all.length} hidden={this.props.isLoading || isNewTrip || !hasNewTramper || !isOpen}>
                        <Button onClick={this.signUpTramper} disabled={true}>
                            <span className='fa fa-user-plus' /> Sign up a tramper:
                    </Button>
                        <Button key='save' color='primary' onClick={this.signUpTramperSave}>
                            {this.props.trip.state.isSaving ? ['Saving ', Spinner] : 'Save'}
                        </Button>
                        <Button key='cancel' color='primary' onClick={this.signUpTramperCancel}>
                            Cancel
                    </Button>
                    </ButtonGroup>,
                    <Button key={'help' + info.all.length} onClick={this.toggleLegend} hidden={this.props.isLoading || isNewTrip || anon}>
                        <span className='fa fa-question-circle' />{showLegend ? 'Hide legend' : 'Show legend'}
                    </Button>,
                    <span key={'participants' + info.all.length} hidden={this.props.isLoading || isNewTrip}>
                        &nbsp; {info.early.length} Participants
                    </span>
                ]}
            </Navbar>,
            (showLegend ? <div className='participant-buttons-legend'>
                {legendIcon('fas fa-star','This person is the leader')}
                {legendIcon('fas fa-podcast','This person is taking a Personal Location Beacon')}
                {legendIcon('fas fa-car','This person is taking a Car')}
                {legendIcon('fas fa-comment','There is special logistical information here')}
                {legendIcon('fas fa-id-badge','This person is not a member of the CTC')}
                {legendButton('fa fa-angle-up','Moves the person up the list')}
                {legendButton('fa fa-angle-down','Moves the person down the list')}
                {legendButton('fa fa-trash','Takes the person off the list')}
                {legendButton('fa fa-sm fa-pen','Puts the person back on the list')}
                {legendButton('fa fa-sm fa-user-plus','Puts the person on the wait-list')}
                {legendButton('fa fa-sm fa-user-times','Takes the person off the wait-list')}
                {legendButton('fa fa-sm fa-phone','Updates emergency contact details')}
            </div> : null),
            <ListGroup key='participants'>
                <ListGroupItem>
                    {
                        info.current.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} participant={p} trip={this.props.trip}
                                owner={this} app={this.props.app} loading={this.props.isLoading} canWaitList={info.late.length !== 0} ref={this.participant}
                                info={info} />)
                    }
                </ListGroupItem>
                <ListGroupItem hidden={info.late.length === 0}>
                    <div onDragOver={onDragOver} onDrop={onDropOnWaitlist}><b>Waitlist</b></div>
                    {
                        info.late.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} participant={p} trip={this.props.trip}
                                owner={this} app={this.props.app} loading={this.props.isLoading} canUnwaitList={true} info={info} />)
                    }
                </ListGroupItem>
                <ListGroupItem hidden={isNewTrip || info.deleted.length === 0}>
                    <div onDragOver={onDragOver} onDrop={this.onDropOnDeleted}><b>Deleted</b></div>
                    {
                        info.deleted.map(p =>
                            <TripParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} participant={p} trip={this.props.trip}
                                owner={this} app={this.props.app} loading={this.props.isLoading} info={info} />)
                    }
                </ListGroupItem>
            </ListGroup>,
            <datalist key='memberlist' id='memberlist'>
                {this.props.app.getMembers()
                    .filter((m: IMember) => this.state.namePrefix && m.name.toUpperCase().startsWith(this.state.namePrefix.toUpperCase()))
                    .filter((m: IMember, i: number) => i < 10)
                    .map((m: any) => <option key={'datalistoption' + m.id} value={m.name} />)}
            </datalist>
        ]
    }
}
