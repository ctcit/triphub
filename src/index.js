import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Button, ButtonGroup, Badge, Navbar, Collapse, Fade, Input, Form, FormGroup, Label, Col, Tooltip  } from 'reactstrap';
import registerServiceWorker from './registerServiceWorker';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import autosize from 'autosize';

const BaseUrl = "http://www.ctc.org.nz/trips.dev/api.php"
const BaseOpt = {headers:{"Api-Key":"6bc3ed05-66a4-4012-96bd-c7192df95997"}}
const Spinner = <span className="fa fa-spinner fa-spin"/>

class Control extends Component {
    constructor(data){
        super(data)
        this.state = {status: "", statusShow: false}
        this.handleFocus = this.handleFocus.bind(this)
        this.handleBlur = this.handleBlur.bind(this)
        this.handleChange = this.handleChange.bind(this)
    }

    componentDidMount(){
        if (this.props.type === "textarea") {
            autosize(this.control);
        }
    }

    handleFocus(){
        this.setState({prevValue: this.props.owner.value(this.props.id)})
    }

    handleBlur(){
        let value = this.props.owner.value(this.props.id)
        if (value === this.state.prevValue || this.props.owner.href === undefined) {
            this.setState({statusShow: false})
        } else {
            let body = (this.props.onSave && this.props.onSave()) || {[this.props.id] : value}
            this.setState({status: ["saving ", Spinner], statusShow: true})
            fetch(this.props.owner.href +
                  `?FAKEPUT=${encodeURIComponent(JSON.stringify(body))}`,
                  BaseOpt)
            .then(() => {
                this.setState({status: "saved", statusShow: true})
                setTimeout(() => this.setState({statusShow: false}), 2000)
            })
        }

        this.props.onBlur && this.props.onBlur()
    }

    handleChange(event){
        let value = this.props.type === "checkbox" ? (event.target.checked ? "1" : "0") : event.target.value

        if (value === this.state.prevValue || this.props.owner.href === undefined) {
            this.setState({statusShow: false})
        } else {
            this.setState({status: "edited", statusShow: true})
        }

        this.props.owner.value(this.props.id, value)
        this.props.onChange && this.props.onChange(value)
    }

    render() {
        let value = this.props.owner.value(this.props.id)
        let validationError = this.props.validate && this.props.validate(value)
        let valueProp = this.props.type === "checkbox" ? {checked: value === "1"} : {value: value}

        return  <FormGroup hidden={this.props.hidden} row>
                    <Label sm={2} for={this.props.id}>{this.props.label}</Label>
                    <Col sm={8}>
                        <Input id={this.props.id} {...valueProp} type={this.props.type}
                            readOnly={this.props.readOnly} ref={this.control} autoComplete="off" list={this.props.list}
                            onFocus={this.handleFocus} onBlur={this.handleBlur} onChange={this.handleChange}/>
                    </Col>
                    <Col sm={2}>
                        <Fade in={this.state.statusShow}>
                            <Badge color="success" size="sm" tabIndex="-1">{this.state.status}</Badge> 
                        </Fade>
                        <Badge color="warning" hidden={!validationError} size="sm" tabIndex="-1">{validationError}</Badge>
                    </Col>
                </FormGroup>
    }
}

class Expandable extends Component {
    constructor(props){
        super(props)
        this.state = {expanded: props.expanded}
        this.toggle = this.toggle.bind(this)
    }

    toggle(){
        this.setState({expanded: !this.state.expanded})
    }

    render(){
        let HLevel = "h" + (this.props.level || "1")
        return [
            <HLevel key={"expHLevel" + this.props.id}>
                <Button color="link" onClick={this.toggle} type="button">{this.state.expanded ? "▼" : "▶"}</Button>
                <span onClick={this.toggle}>{this.props.title}</span>
            </HLevel>,
            <Collapse key={"expCollapse" + this.props.id} isOpen={this.state.expanded}>{this.props.children}</Collapse>
        ]
    }
}

class TripDetail extends Component {
    constructor(props){
        super(props)
        this.state = {}
        this.href = this.props.owner.state.trip.href
        this.validateDate = this.validateDate.bind(this)
        this.value = this.value.bind(this)
    }

    validateDate() {
        let trip = this.props.owner.state.trip
        return trip.openDate > trip.closeDate 
                    ? "Open date must be before Close date"
                    : trip.closeDate > trip.date
                        ? "Close date must be before Trip date"
                        : null
    }

    value(id,val){
        let trip = this.props.owner.state.trip;
        if (val === undefined) {
            return trip[id]
        } else {
            trip = {...trip}
            trip[id] = val
            this.props.owner.setState({trip:trip})
        }
    }

    render(){
        return  (
            <Form>
                <Control owner={this} id="fifth-sprite-117903:australia-southeast1:alastairgbrown" label="Title" type="text" validate={v => v === "" ? "Title can't be blank" : null}/>
                <Control owner={this} id="openDate" label="Open Date" type="date" validate={this.validateDate}/>
                <Control owner={this} id="closeDate" label="Close Date" type="date"  validate={this.validateDate}/>
                <Control owner={this} id="date" label="Trip Date" type="date"  validate={this.validateDate}/>
                <Control owner={this} id="length" label="Length in days" type="number" 
                                        validate={v => parseInt(v,10) < 1 || parseInt(v,10) > 7 ? "Length should be between 1 and 7 days" : null}/>
                <Control owner={this} id="departurePoint" label="Departure Point" type="text" />
                <Control owner={this} id="cost" label="Cost" type="text" />
                <Control owner={this} id="grade" label="Grade" type="text" />
                <Control owner={this} id="maxParticipants" label="Maximum number of trampers" type="number"  
                                        validate={v => parseInt(v,10) < 0 ? "This should be 0 or higher" : null}/>
                <Control owner={this} id="description" label="Description" type="textarea" />
                <Control owner={this} id="logisticInfo" label="Logistic Information" type="textarea" />
            </Form>
        )
    }
}

class TripParticipant extends Component {
    constructor(data){
        super(data)
        this.state = {}
        this.href = this.props.participant.href
        this.toggle = this.toggle.bind(this)
        this.setRemoved = this.setRemoved.bind(this)
        this.nameSave = this.nameSave.bind(this)
        this.nameChanged = this.nameChanged.bind(this)
        this.value = this.value.bind(this)
        this.icon = this.icon.bind(this)
    }

    toggle(){
        if (this.props.owner.state.expandedParticipant === this.state.id){
            this.props.owner.setState({expandedParticipant: 0})
        } else {
            this.props.owner.setState({expandedParticipant: this.state.id})
        }
    }

    setRemoved(isDeleted){
        this.setState({isSaving: true})
        fetch(this.href + 
            `?FAKEPUT=${encodeURIComponent(JSON.stringify({isDeleted: isDeleted}))}`,
            BaseOpt)
        .then(this.props.owner.requeryParticipants)
    }

    nameSave(){
        return {
            memberid: this.value("memberid"),
            name: this.value("name"),
            email: this.value("email"),
            phone: this.value("phone"),
        }
    }

    nameChanged(value){
        let member = this.props.controller.state.members.find(m => m.name === value)

        if (member === undefined) {
            this.value("memberid", 0) 
        } else {
            this.value("memberid", member.id) 
            this.value("email", member.email) 
            this.value("phone", member.phone) 
        }
    }

    value(id,val){
        let participants = this.props.owner.state.participants
        let participant = participants.find(p => p.id === this.props.participant.id)

        if (val === undefined) {
            return participant[id]
        } else {
            let index = participants.indexOf(participant) 
            participants = [...participants]
            participants[index] = {...participant}
            participants[index][id] = val
            this.props.owner.setState({participants:participants})
        }
    }

    icon(icon,tooltip){
        var id = icon + (this.props.participant.id || "new") 
        return [
            <span className={`fa fa-${icon}`} id={id}/>,
            <Tooltip isOpen={this.state[icon]} target={id} toggle={() => this.setState({[icon]: !this.state[icon]})}>
                {tooltip}
            </Tooltip>
        ]
    }

    render(){
        let readOnly = {readOnly: false}
        let participant = this.props.participant
        let title = [
            participant.name," ",
            participant.isLeader === "1" ? this.icon("star",`${participant.name} is the leader`) : ""," ",
            participant.isPLBProvider === "1" ? this.icon("podcast",`${participant.name} is bringing a PLB`) : ""," ",
            participant.isVehicleProvider === "1" ? this.icon("car",`${participant.name} is bringing a car`) : ""," ",
            (participant.logisticInfo || "").trim() !== "" ? this.icon("commenting", participant.logisticInfo) : ""," ",
        ]

        return (  
            <Expandable title={title} level="3" expanded={participant.id === undefined}>
                <Form className="indentedparticipants">
                    <Control owner={this} id="name" label="Name" type="text" list="allmembers" onChange={this.nameChanged} onSave={this.nameSave} {...readOnly}/>
                    <Control owner={this} id="email" label="Email" type="text" {...readOnly}/>
                    <Control owner={this} id="phone" label="Phone" type="text"  {...readOnly}/>
                    <Control owner={this} id="isLeader" label="Leader" type="checkbox" {...readOnly}/>
                    <Control owner={this} id="isPLBProvider" label="Has PLB" type="checkbox" {...readOnly}/>
                    <Control owner={this} id="isVehicleProvider" label="Has Car" type="checkbox" {...readOnly}/>
                    <Control owner={this} id="vehicleRego" label="Rego" type="text" hidden={participant.isVehicleProvider === "0"} {...readOnly}/>
                    <Control owner={this} id="logisticInfo" label="Logistic Information" type="textarea" {...readOnly}/>
                    <FormGroup row>
                        <Col sm={12}>
                            <Button hidden={participant.isDeleted === "1" || participant.href === undefined} 
                                    onClick={() => this.setRemoved("1")}>
                                {participant.isSaving ? ["Removing ", Spinner] : "Remove"}
                            </Button>
                            <Button hidden={participant.isDeleted === "0" || participant.href === undefined} 
                                    onClick={() => this.setRemoved("0")}>
                                {participant.isSaving ? ["Signing back up ", Spinner] : "Sign back up"}
                            </Button>
                        </Col>
                    </FormGroup>
                </Form>
            </Expandable>
        )
    }
}

class TripParticipants extends Component {
    constructor(data){
        super(data)
        this.state = {}
        this.signMeUp = this.signMeUp.bind(this)
        this.signUpTramperSave = this.signUpTramperSave.bind(this)
        this.signUpTramperCancel = this.signUpTramperCancel.bind(this)
        this.signUpTramper = this.signUpTramper.bind(this)
        this.participant = React.createRef()
    }

    signUpTramperSave(){
        let participant = this.props.owner.state.participants.filter(p => p.id === undefined)

        fetch(`${this.props.owner.props.triphref}/participants`+
                `?FAKEPOST=${encodeURIComponent(JSON.stringify(participant))}`,
                BaseOpt)
        .then(this.props.owner.requeryParticipants)
    }

    signUpTramperCancel(){
        this.props.owner.setState({participants: this.props.owner.state.participants.filter(p => p.id !== undefined)})
    }

    signUpTramper(){
        let participants = this.props.owner.state.participants
        var participant = {
            memberid: 0, 
            name: "", 
            email: "", 
            phone: "", 
            isLeader: "0",
            isDeleted: "0",
            isPLBProvider: "0",
            isVehicleProvider: "0",
            vehicleRego: "",
            logisticInfo: "",
        }
        this.props.owner.setState({participants:[participant, ...participants]})
    }

    signMeUp(){
        let me = this.props.controller.getMe()
        let participant = {memberid: me.id, name: me.name, email: me.email, phone: me.phone, isDeleted: "0"}

        this.props.controller.setStatus("Signing up...")
        fetch(`${this.state.href}/participants` +
              `?FAKEPOST=${encodeURIComponent(JSON.stringify(participant))}`,
              BaseOpt)
        .then(this.props.owner.requeryParticipants)
    }

    render() {
        let me = this.props.controller.getMe()
        let all = this.props.participants
        let maxParticipants = this.props.maxParticipants === "0" ? 999 : parseInt(this.props.owner.state.trip.maxParticipants,10)
        let current = all.filter(p => p.isDeleted === "0").filter((p,i) => i < maxParticipants)
        let waitlist = all.filter(p => p.isDeleted === "0").filter((p,i) => i >= maxParticipants)
        let removed = all.filter(p => p.isDeleted === "1")
        let loading = this.props.controller.state.loading
        let tripnew = this.props.controller.state.tripnew
        
        return  [
            <Navbar color="light" light expand="md">
                <Button onClick={this.signMeUp} hidden={tripnew || loading || me === undefined || all.find(m => m.memberid === me.id) !== null}>
                    Sign me up!
                </Button>
                &nbsp;
                <Button onClick={this.signUpTramper} hidden={tripnew || loading || all.find(p => p.id === undefined)}>
                    Sign up a tramper
                </Button>
                <ButtonGroup hidden={tripnew || loading || !all.find(p => p.id === undefined)}>
                    <Button disabled={true}>
                        Sign up a tramper
                    </Button>
                    <Button onClick={this.signUpTramperSave}>
                        Save
                    </Button>
                    <Button onClick={this.signUpTramperCancel}>
                        Cancel
                    </Button>
                </ButtonGroup>
                &nbsp;
                <span hidden={tripnew || loading}>
                    {current.length} Participants
                </span>
            </Navbar>,
            <div key="current" className="indentedparticipants">
                {current.map(p =>
                    <TripParticipant key={p.id} participant={p} owner={this.props.owner} controller={this.props.controller} ref={this.participant}/>)}
            </div>,
            waitlist.length === 0 ? "" :
                <Expandable key="waitlist" id="tpr" expanded={false} title="Waitlist" level="3">
                    <div className="indentedparticipants">
                    {waitlist.map(p =>
                        <TripParticipant key={p.id} participant={p} owner={this.props.owner} controller={this.props.controller}/>)}
                    </div>
                </Expandable>,
            removed.length === 0 ? "" :
                <Expandable key="removed" id="tpr" expanded={false} title="Removed" level="3">
                    <div className="indentedparticipants">
                    {removed.map(p =>
                        <TripParticipant key={p.id} participant={p} owner={this.props.owner} controller={this.props.controller}/>)}
                    </div>
                </Expandable>
        ]
    }
}

class Trip extends Component {
    constructor(){
        super()
        this.state = {
            trip: {id:0},
            tripVersion: 0,
            participants: [],
            participantsVersion: 0,
        }
        this.requeryParticipants = this.requeryParticipants.bind(this)
        this.detail = React.createRef()
        this.participants = React.createRef()
    }

    componentDidMount(){
        if (this.props.controller.state.tripnew) {
            this.props.controller.setStatus("Suggested trip")

            let suggestedTrip = this.props.controller.suggestedTrip 
            this.props.controller.setState({loading: false})    
            this.setState({trip:suggestedTrip.detail, participants:[suggestedTrip.leader]})

        } else {
            this.props.controller.setStatus(["Loading ", Spinner])
            fetch(this.props.controller.state.triphref, BaseOpt)
            .then(results => results.json())
            .then(data => {
                this.props.controller.setState({tripremoved: data.isDeleted})
                this.setState({trip:data})
                this.requeryParticipants()
            })
        }
    }

    requeryParticipants(){
        fetch(`${this.props.controller.state.triphref}/participants`,BaseOpt)
        .then(results => results.json())
        .then(data => {
            this.setState({participants: data})
            this.props.controller.setState({loading: false})
            this.props.controller.setStatus("Loaded Trip", 3000)
        })
    }

    render(){
        return [
            <Expandable id="td" title="Trip Detail" level="2" expanded={true}>  
                <TripDetail trip={this.state.trip}
                            owner={this} controller={this.props.controller} ref={this.detail}/>
            </Expandable>,
            <Expandable key="tp" id="tp" title="Participants" level="2" expanded={true}>  
                <TripParticipants participants={this.state.participants} 
                                  owner={this} controller={this.props.controller} ref={this.participants}/>
            </Expandable>
        ]
    }
}

class TripsLine extends Component {
    constructor(props){
        super(props)
        this.onClick = this.onClick.bind(this) 
    }

    onClick() {
        this.props.controller.setMode(this.props.trip.href, false, false)
    }

    render(){
        return  <tr className="TripsLine">
                    <td onClick={this.onClick}>{this.props.trip.date}</td>
                    <td onClick={this.onClick}>{this.props.trip.length}</td>
                    <td onClick={this.onClick}>{this.props.trip.title}</td>
                    <td>
                        <Button color="link" onClick={this.onClick}>▶</Button>
                    </td>
                </tr>
    }
}

class TripsGroup extends Component {
    constructor(data){
        super()
        data.data.expanded = true
        this.state = data.data
    }

    render(){

        return  <table className="TripGroup">
                    <thead>
                        <tr>
                            <th>Date</th><th>Length</th><th>Title</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.trips.map(
                            trip => <TripsLine trip={trip} key={trip.id} controller={this.props.controller}/>)}
                    </tbody>    
                </table>
    }
}

class TripsList extends Component {
    constructor(){
        super()
        this.state = {groups: []}
    }

    componentDidMount(){
        this.props.controller.setStatus(["Loading ", Spinner])
        fetch(`${BaseUrl}/trips`,BaseOpt)
        .then(results => results.json())
        .then(data => {
            this.props.controller.setStatus("Loaded", 3000)
            this.setState({groups:data})
            this.props.controller.setState({loading:false});
        })
    }

    render(){
        return  <div>
                    {this.state.groups.map(
                        (data,i) => <Expandable key={"tg" + i} id={"tg" + i} expanded={true} title={data.name}>
                                        <TripsGroup data={data} key={"tripGroup" + i} controller={this.props.controller}/>
                                    </Expandable>)}
                </div>
    }
}

class TripsController extends Component {
    constructor(){
        super()
        this.state = {
            triphref: null,
            triplist: true,
            tripnew: false,
            status: ["Loading ", Spinner],
            statusShow: true,
            loading: true,
            members: [],
        }
        this.setMode = this.setMode.bind(this) 
        this.setStatus = this.setStatus.bind(this) 
        this.startSuggestedTrip = this.startSuggestedTrip.bind(this) 
        this.saveSuggestedTrip = this.saveSuggestedTrip.bind(this) 
        this.cancelSuggestedTrip = this.cancelSuggestedTrip.bind(this) 
        this.deleteTrip = this.deleteTrip.bind(this)
        this.getMe = this.getMe.bind(this)
        this.trip = React.createRef()
    }

    setMode(triphref,triplist,tripnew) {
        this.setState({triphref: triphref, triplist: triplist, tripnew: tripnew, tripremoved: null, loading: true})
    }

    setStatus(status, keepFor = null) {
        if (this.state.statusTimer !== null) {
            window.clearTimeout(this.state.statusTimer)
        }
        this.setState({status: status, statusShow: true})
        this.setState({statusTimer: keepFor === null ? null : window.setTimeout(() => this.setState({statusShow: false}), keepFor)})
    }

    startSuggestedTrip(){
        let date, closeDate, openDate = new Date()
        let me = this.getMe()

        openDate.setMonth(openDate.getMonth()+1)
        openDate.setDate(1)
        closeDate = new Date(openDate)
        closeDate.setDate(closeDate.getDate() + 14 - closeDate.getDay())
        date = new Date(closeDate)
        date.setDate(date.getDate() + 7)

        this.suggestedTrip = {
            detail: {
                title: me.name + "'s suggested trip",
                date: date.toISOString().substring(0,10),
                openDate: openDate.toISOString().substring(0,10),
                closeDate: closeDate.toISOString().substring(0,10),
                length: "1",
                departurePoint: "Z Papanui",
                cost: "",
                grade: "",
                description: "",
                logisticInfo: "",
            },
            leader: {
                memberid: me.id, 
                name: me.name, 
                email: me.email, 
                phone: me.phone, 
                isLeader: "1",
                isDeleted: "0",
                isPLBProvider: "0",
                isVehicleProvider: "0",
                vehicleRego: "",
                logisticInfo: "",
            }
        }
        this.setMode(null,false,true);
    }

    saveSuggestedTrip(){
        let detail = this.trip.current.detail.current.state
        let leader = this.trip.current.participants.current.participant.current.state

        console.log(JSON.stringify(detail))
        console.log(JSON.stringify(leader))

        fetch(`${BaseUrl}/trips`+
              `?FAKEPOST=${encodeURIComponent(JSON.stringify(detail))}`,
              BaseOpt)
        .then(results => results.json())
        .then(data => { 
                console.log(JSON.stringify(data))
                fetch(`${data.href}/participants`+
                      `?FAKEPOST=${encodeURIComponent(JSON.stringify(leader))}`,
                      BaseOpt)
                .then(() => this.setMode(null, true, false))
            })
        }

    cancelSuggestedTrip(){
        let detail = this.trip.current.detail.current.state
        let leader = this.trip.current.participants.current.participant.current.state

        if (JSON.stringify({detail:detail,leader:leader}) === JSON.stringify(this.suggestedTrip) ||
            window.confirm("You have made changes, are you sure you want to cancel?")) {
            this.setMode(null,true,false)
        }
    }

    deleteTrip(){
        let newstate = {isDeleted: this.state.tripremoved === "1" ? "0" : "1"} 

        fetch(`${this.state.triphref}?FAKEPUT=${encodeURIComponent(JSON.stringify(newstate))}`,
              BaseOpt)
        .then(() => this.setMode(null,true,false))
    }

    getMe(){
        return this.state.members.find(m => m.isMe === "1")
    }

    componentDidMount() {
        fetch(`${BaseUrl}/members`,BaseOpt)
        .then(results => results.json())
        .then(data => {
            this.setState({members:data})
        })
    }

    render(){
        return  [
            <Navbar color="light" light expand="md">
                <Button color="primary" onClick={() => this.setMode(null,true,false)} 
                        hidden={this.state.loading || this.state.triphref === null}>
                    Show all trips
                </Button>
                &nbsp;
                <Button color="primary" onClick={this.deleteTrip} 
                        hidden={this.state.loading || this.state.triphref === null || this.state.tripremoved !== "0"}>
                    Delete this trip
                </Button>
                &nbsp;
                <Button color="primary" onClick={this.deleteTrip} 
                        hidden={this.state.loading || this.state.triphref === null || this.state.tripremoved !== "1"}>
                    Undelete this trip
                </Button>
                &nbsp;
                <Button color="primary" onClick={this.startSuggestedTrip} 
                        hidden={this.state.loading || !this.state.triplist}>
                    Suggest a trip
                </Button>
                &nbsp;
                <ButtonGroup hidden={this.state.loading || !this.state.tripnew}>
                    <Button color="primary" onClick={this.startSuggestedTrip} disabled={true}>
                        Suggest a trip
                    </Button>
                    <Button color="primary" onClick={this.saveSuggestedTrip}>
                        Save
                    </Button>
                    <Button color="primary" onClick={this.cancelSuggestedTrip} hidden={!this.state.tripnew}>
                        Cancel
                    </Button>
                </ButtonGroup>
                &nbsp;
                <span>
                    <Fade in={this.state.statusShow}>
                        <Badge color="success">{this.state.status}</Badge>
                    </Fade>
                </span>
            </Navbar>,  
            this.state.triplist 
                ? <TripsList controller={this}/>
                : <Trip triphref={this.state.triphref} tripnew={this.state.tripnew} controller={this} ref={this.trip}/>,
            <datalist id="allmembers">
                {this.state.members.map(m => <option key={m.id} value={m.name} />)}
            </datalist>
        ]
    }
}

ReactDOM.render(<TripsController/>, document.getElementById('root'))
registerServiceWorker()
