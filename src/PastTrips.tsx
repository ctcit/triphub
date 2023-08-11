import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import { Component } from 'react'
import { Button, ButtonGroup, Col, Container, Row } from 'reactstrap'
import { ControlWrapper, InputControl, SelectControl, SwitchesControl } from './Control'
import { BindMethods, FormatDate, GradeIcon } from './Utilities'
import { Spinner } from './Widgets'
import { Accordian } from './Accordian'
import { ITrip, Role } from './Interfaces'
import { TripsGroup } from './TripsList'
import { ConfigService } from './Services/ConfigService'
import { MembersService } from './Services/MembersService'
import { TripsService } from './Services/TripsService'
import { MapSheetControl } from './MapSheetControl'

const MemberAsOptions = ["Don't care", "Leader", "Non-Leader", "Tramper", "Editor", "Either"] as const
type MemberAsOption = typeof MemberAsOptions[number]
interface IPastTripsShow {
    advanced?: boolean
    trips?: boolean
    fields?: boolean
    lengths?: boolean
    grades?: boolean
    costs?: boolean
    participants?: boolean
    prerequisites?: boolean
    approvals?: boolean
}

interface IPastTripsState {
    version: number
    fromDate: string
    toDate: string
    limit: string
    keywords: string
    me: MemberAsOption
    member0: string
    member1: string
    member2: string
    memberAs0: MemberAsOption
    memberAs1: MemberAsOption
    memberAs2: MemberAsOption
    fields: string
    lengthMin: string
    lengthMax: string
    grades: string
    costMin: string
    costMax: string
    participantsMin: string
    participantsMax: string
    prerequisites: string
    approvals: string
    maps: string[]
    routes: number[][][]
    querying?: boolean
    show?: IPastTripsShow
    highlights?: { [key: string]: RegExp }
    trips: ITrip[]
}

type PastTripsFields = keyof IPastTripsState

class Range {
    private owner: PastTrips
    private propertyMin: PastTripsFields
    private propertyMax: PastTripsFields
    private values: number[]
    private display: (v: number) => string

    constructor(
        owner: PastTrips,
        propertyMin: PastTripsFields,
        propertyMax: PastTripsFields,
        values: number[],
        display: (v: number) => string) {
        this.owner = owner
        this.propertyMin = propertyMin
        this.propertyMax = propertyMax
        this.values = values
        this.display = display
    }

    get min() { return parseFloat(this.owner.state[this.propertyMin] as string) }
    get max() { return parseFloat(this.owner.state[this.propertyMax] as string) }
    get default() { return { min: 0, max: this.values.length - 1 } }
    get isEdited() { return this.min !== this.default.min || this.max !== this.default.max }
    get value() { return this.isEdited ? { min: this.values[this.min], max: this.values[this.max] } : undefined }

    public render() {
        const { onGet, onSave, onGetValidationMessage } = this.owner
        const onSet = (field: string, value: any) => {
            if ((field === this.propertyMin && parseFloat(value) > this.max) ||
                (field === this.propertyMax && parseFloat(value) < this.min)) {
                this.owner.onSaveState({ [this.propertyMin]: value, [this.propertyMax]: value })
            } else {
                this.owner.onSaveState({ [field]: value })
            }
        }

        const common = {
            id: 'trip', owner: this.owner, forceValidation: false,
            onGet, onSet, onSave, onGetValidationMessage
        }
        return <>
            <table>
                <tbody>
                    <tr>
                        <td>
                            <InputControl type="range" field={this.propertyMin} label='From'
                                className='pastTripRange'
                                min={0} max={this.values.length - 1} {...common} />
                        </td>
                        <td>
                            <ControlWrapper id='labels' field='labels' label='' saving={false}>
                                <div className='pastTripRangeLabels'> {[...this.values].reverse().map(c =>
                                    <div key={c} >{c === 999999 ? 'Max' : this.display(c)}</div>)}</div>
                            </ControlWrapper>
                        </td>
                        <td>
                            <InputControl type="range" field={this.propertyMax} label='To'
                                className='pastTripRange'
                                min={0} max={this.values.length - 1} {...common} />
                        </td>
                    </tr>
                </tbody>
            </table>
        </>
    }
}

export class PastTrips extends Component<{
    role: Role,
    setPath(path: string): void
}, IPastTripsState>{
    private cost = new Range(
        this, 'costMin', 'costMax', [0, 20, 30, 40, 50, 75, 100, 200, 999999], v => `$${v}`)
    private length = new Range(
        this, 'lengthMin', 'lengthMax', [1, 2, 3, 4, 999999], v => `${v} day`)
    private participants = new Range(
        this, 'participantsMin', 'participantsMax', [1, 2, 3, 4, 5, 10, 15, 20, 999999], v => `${v}`)
    constructor(props: any) {
        super(props)
        const { defaults } = this
        this.state = {
            ...defaults,
            ...JSON.parse(localStorage.getItem('pasttrips') ?? '{}')
        }
        this.state = {
            ...this.state,
            querying: false,
            trips: [],
            show: {
                ...Object.fromEntries(Object.entries(this.state).map(([k, v]) => [k, !!v])),
                fields: this.state.fields !== defaults.fields,
                lengths: this.length.isEdited,
                costs: this.cost.isEdited,
                participants: this.participants.isEdited,
                advanced: !!this.numberOfUsedAdvancedFields,
                trips: false,
            }
        }
        BindMethods(this)
    }

    public get defaults(): IPastTripsState {
        const toDate = new Date()
        const fromDate = new Date(toDate.getFullYear(), toDate.getMonth() - 6, toDate.getDate())

        return {
            version: toDate.getTime(),
            fromDate: FormatDate(fromDate, 'YYYY-MM-DD'),
            toDate: FormatDate(toDate, 'YYYY-MM-DD'),
            limit: '100',
            keywords: '',
            member0: 'Any',
            member1: 'Any',
            member2: 'Any',
            memberAs0: 'Either',
            memberAs1: 'Either',
            memberAs2: 'Either',
            fields: Object.keys(this.fields).join(),
            grades: '',
            lengthMin: `${this.length.default.min}`,
            lengthMax: `${this.length.default.max}`,
            costMin: `${this.cost.default.min}`,
            costMax: `${this.cost.default.max}`,
            participantsMin: `${this.participants.default.min}`,
            participantsMax: `${this.participants.default.max}`,
            prerequisites: '',
            approvals: '',
            me: "Don't care",
            maps: [],
            routes: [],
            show: {},
            trips: [],
        }
    }

    public get grades() {
        return {
            'Easy': ['Easy'],
            'Easy/Mod': ['Easy', 'Moderate'],
            'Moderate': ['Moderate', 'Mod'],
            'Mod/Hard': ['Moderate', 'Hard'],
            'Hard': ['Hard'],
            'Social': ['Social'],
            'Bike': ['Bike', 'MTB', 'Cycling'],
            'Water': ['Water', 'Wet'],
            'Training': ['Training'],
        }
    }

    public get approvals() {
        return Object.fromEntries(
            'Pending,Approved,Rejected,SuggestChanges,Resubmitted,Draft,Deleted'
                .split(',').map(e => [e, [`^${e}$`]]))
    }


    public get fields() {
        return {
            'Title': 'title',
            'Departure Details': 'departureDetails',
            'Description': 'description',
            'Logistic Information': 'logisticInfo'
        }
    }

    public get prerequisites() {
        const config = ConfigService.Config
        return config.prerequisiteEquipment + ',' + config.prerequisiteSkills
    }

    public get members(): Array<{ name: string, as: MemberAsOption, visible: boolean }> {
        const { member0, member1, member2, memberAs0, memberAs1, memberAs2, me } = this.state
        return [
            { name: MembersService.Me.name, as: me, visible: me !== "Don't care" },
            { name: member0, as: memberAs0, visible: this.isAdmin },
            { name: member1, as: memberAs1, visible: this.isAdmin && member0 !== 'Any' },
            { name: member2, as: memberAs2, visible: this.isAdmin && member0 !== 'Any' && member1 !== 'Any' },
        ]
    }

    get numberOfUsedAdvancedFields() {
        const { defaults, state } = this
        const exclude = new Set<PastTripsFields>(['keywords', 'fromDate', 'toDate', 'me', 'highlights', 'version', 'show', 'trips'])
        const used = Object.keys(defaults).map(k => k as PastTripsFields).filter((k: PastTripsFields) =>
            !exclude.has(k) && JSON.stringify(defaults[k]) !== JSON.stringify(state[k]))
        return used.length
    }

    public get isAdmin() { return MembersService.amAdmin(this.props.role) }

    public requery() {
        const { maps, fields } = this.state
        const map = (options: string, mapping: { [key: string]: string[] }) =>
            [...new Set(options.split(', ').flatMap(i => mapping[i] ?? []))]
        const fieldList = fields ? fields.split(',') : Object.keys(this.fields)
        const fulltext = {
            ...Object.fromEntries(fieldList.map(f => [(this.fields as any)[f] as string, this.state.keywords])),
            prerequisites: this.state.prerequisites,
            grade: map(this.state.grades, this.grades).join(' '),
        }
        const regexp = {
            approval: map(this.state.approvals, this.approvals),
            maps: maps.map(m => m.split(' ')[0] + '[ A-Za-z]*'),
        }
        const members = this.members.filter(({ name, visible }) => name !== 'Any' && visible)
        const parameters = Object.fromEntries(Object.entries({
            from: this.state.fromDate,
            to: this.state.toDate,
            limit: this.state.limit,
            deleted: /Deleted/.test(this.state.approvals) ? 1 : 0,
            ...fulltext,
            ...regexp,
            length: this.length.value,
            cost: this.cost.value,
            participants: this.participants.value,
            memberMap: Object.fromEntries(members.map(m => [m.name, m.as])),
        }).filter(([_, v]) => Array.isArray(v) ? v.length : v))

        this.setState({
            querying: true,
            version: new Date().getTime()
        })

        TripsService.getPastTrips(parameters)
            .then((trips: ITrip[]) => {
                this.setState({
                    querying: false,
                    version: new Date().getTime(),
                    highlights: {
                        ...Object.fromEntries(Object.entries(fulltext)
                            .filter(([_, v]) => v)
                            .map(([k, v]) => [k, RegExp(v.replace(/\W+/g, '|'), 'gi')])),
                        ...Object.fromEntries(Object.entries(regexp)
                            .filter(([_, v]) => v && v.length)
                            .map(([k, v]) => [k, RegExp(v.join('|'), 'gi')])),
                    },
                    trips,
                    show: {
                        ...this.state.show,
                        trips: !!trips.length
                    }
                })
            })
    }

    public onQuery() {
        this.requery()
    }

    public onReset() {
        localStorage.setItem('pasttrips', '{}')
        this.setState(this.defaults)
    }

    public onToggleAdvanced() {
        const { show } = this.state
        this.setState({ version: new Date().getTime(), show: { ...show, advanced: !show?.advanced } })
    }

    public onSaveState(state: Partial<IPastTripsState>) {
        this.setState(state as any)
        localStorage.setItem('pasttrips', JSON.stringify({ ...this.state, ...state }))
    }

    public onGet(key: string): any { return (this.state as any)[key] }
    public onSet(key: string, value: any): void {
        const field = key as PastTripsFields
        const { costMax, costMin, lengthMax, lengthMin, participantsMin, participantsMax } = this.state
        let update: Partial<IPastTripsState> = { [field]: value }
        if ((field === 'costMin' && parseFloat(value) > parseFloat(costMax)) ||
            (field === 'costMax' && parseFloat(value) < parseFloat(costMin))) {
            update = { costMin: value, costMax: value }
        }
        if ((field === 'participantsMin' && parseFloat(value) > parseFloat(participantsMax)) ||
            (field === 'participantsMax' && parseFloat(value) < parseFloat(participantsMin))) {
            update = { participantsMin: value, participantsMax: value }
        }
        if ((field === 'lengthMin' && parseFloat(value) > parseFloat(lengthMax)) ||
            (field === 'lengthMax' && parseFloat(value) < parseFloat(lengthMin))) {
            update = { lengthMin: value, lengthMax: value }
        }
        this.onSaveState(update)
    }
    public onSave(key: string, value: any): Promise<void> { return (this.onSet(key, value), Promise.resolve()) }
    public onGetValidationMessage(_: string): any { return null }

    public render() {
        const { version, querying, highlights, trips, show } = this.state
        const members = MembersService.Members
        const { onGet, onSet, onSave, onGetValidationMessage } = this
        const nameOptions = {
            'Members': members.filter(m => m.isMember).map(m => m.name),
            'Non-Members': members.filter(m => !m.isMember).map(m => m.name),
            'Any': ['Any'],
        }
        const keys = (map: { [key: string]: any }) => Object.keys(map).join(',')
        const common = {
            id: 'trip',
            owner: this,
            forceValidation: false,
            onGet, onSet, onSave, onGetValidationMessage,
        }
        const usedFields = this.numberOfUsedAdvancedFields
        const advancedTitle = 'Advanced' + (usedFields ? ` (querying ${usedFields} field${usedFields > 1 ? 's' : ''})` : ``)
        const gradeRender = (option: string) =>
            <span><span className={`gradeIcon fas fa-${GradeIcon({ grade: option })}`} /> {option}</span>

        return [
            <Container key={version + 2} fluid={true}>
                <Row>
                    <Col sm={6} md={6}>
                        <h2>Past trips query</h2>
                    </Col>
                </Row>
                <Row>
                    <Col sm={2} md={2}>
                        <InputControl field='fromDate' label='From' type='date' helpText='The date of the earliest trip' {...common} />
                    </Col>
                    <Col sm={2} md={2}>
                        <InputControl field='toDate' label='To' type='date' helpText='The date of the latest trip' {...common} />
                    </Col>
                    <Col sm={2} md={2}>
                        <SelectControl field='me' label='Me' options={MemberAsOptions}  {...common} />
                    </Col>
                </Row>
                <Row>
                    <Col sm={6} md={6}>
                        <InputControl field='keywords' label='Keywords' type='text' {...common} />
                    </Col>
                </Row>
                <Accordian id='advanced' key={version + 3} 
                    title={advancedTitle}
                    className='trip-group' headerClassName='others-header' 
                    expanded={show?.advanced}
                >
                    <Container fluid={true}>
                        <Row>
                            <Col sm={2} md={2}>
                                <InputControl field='limit' label='Limit' type='number' helpText='The maximum number of trips shown' {...common} />
                            </Col>
                            <Col sm={2} md={2}>
                                <Accordian id='fields_accordian' title='Fields' expanded={show?.fields}>
                                    <SwitchesControl field='fields' label='' options={keys(this.fields)} {...common} />
                                </Accordian>
                            </Col>
                        </Row>
                        {this.members.slice(1).filter(({ visible }) => visible).map((_, i) =>
                            <Row key={i}>
                                <Col sm={6} md={6}>
                                    <SelectControl field={`member${i}`} label='Member' options={nameOptions} {...common} />
                                </Col>
                                <Col sm={2} md={2}>
                                    <SelectControl field={`memberAs${i}`} label='As' options={MemberAsOptions.slice(1)} {...common} />
                                </Col>
                            </Row>
                        )}
                        <Row>
                            <Col sm={2} md={2}>
                                <Accordian id='lengths_accordian' title='Length' expanded={show?.lengths}>
                                    {this.length.render()}
                                </Accordian>
                            </Col>
                            <Col sm={2} md={2}>
                                <Accordian id='costs_accordian' title='Costs' expanded={show?.costs}>
                                    {this.cost.render()}
                                </Accordian>
                            </Col>
                            <Col sm={2} md={2}>
                                <Accordian id='participants_accordian' title='Participants' expanded={show?.participants}>
                                    {this.participants.render()}
                                </Accordian>
                            </Col>
                            <Col sm={2} md={2}>
                                <Accordian id='grades_accordian' title='Grades' expanded={show?.grades}>
                                    <SwitchesControl field='grades' label='' options={keys(this.grades)}
                                        renderOption={gradeRender} {...common} />
                                </Accordian>
                            </Col>
                            <Col sm={2} md={2}>
                                <Accordian id='prerequisites_accordian' title='Prerequisites' expanded={show?.prerequisites}>
                                    <SwitchesControl field='prerequisites' label='' options={this.prerequisites} {...common} />
                                </Accordian>
                            </Col>
                            <Col sm={2} md={2}>
                                <Accordian id='approvals_accordian' title='State' expanded={show?.approvals}>
                                    <SwitchesControl field='approvals' label='' options={keys(this.approvals)} {...common} />
                                </Accordian>
                            </Col>
                        </Row>
                        <Row>
                            <Col sm={10}>
                                <MapSheetControl 
                                    label='Map sheets'
                                    {...common}
                                />
                            </Col>
                        </Row>
                    </Container>
                </Accordian>
                <ButtonGroup>
                    <Button onClick={this.onQuery} disabled={querying}>
                        {querying ? Spinner : <span className='fa fa-search' />}
                        {querying ? 'Querying' : 'Query'}
                    </Button>
                    &nbsp;
                    <Button onClick={this.onReset} disabled={querying}>
                        <span className='fa fa-stop-circle' />
                        Reset
                    </Button>
                </ButtonGroup>
            </Container>,
            <TripsGroup key={version + 4} trips={trips} title='Trips'
                expanded={show?.trips} 
                highlights={highlights} 
                isOnline={true}
                setPath={this.props.setPath}
            />
        ]
    }
}