import { Component } from 'react'
import * as React from 'react'
import { IHistoryItem, IParticipant, ITrip } from './Interfaces'
import { Accordian } from './Accordian'
import { Spinner } from './Widgets'
import ListGroup from 'reactstrap/lib/ListGroup'
import ListGroupItem from 'reactstrap/lib/ListGroupItem'
import { BindMethods, FormatDate } from './Utilities'
import { MembersService } from './Services/MembersService'
import { TripsService } from './Services/TripsService'


function GetDate(item: IHistoryItem): string {
    return FormatDate(new Date(`${item.timestamp}Z`), 'YYYY-MM-DD')
}

function GetTime(item: IHistoryItem): string {
    return FormatDate(new Date(`${item.timestamp}Z`), 'HH:mm')
}

function GetColumn(column: string): string {
    let out = column[0].toUpperCase()

    for (let i = 1; i < column.length; i++) {
        out += (column[i] >= 'A' && column[i] <= 'Z' ? ' ' : '') + column[i]
    }

    return out
}

class HistoryItem extends Component<{
    item: IHistoryItem
    history: History
}, {}>{
    constructor(props: any) {
        super(props)
        this.state = {}
    }

    public render() {
        const item = this.props.item
        const table = this.props.item.table.split('.')[1]
        const action = item.action[0].toUpperCase() + item.action.substring(1)
        const participant = item.participantId ? this.props.history.getValue(item, 'name') : null
        let title: any[] = []
        let detail
        let i = 0

        if (action === 'Email') {
            title = [<span key={i++} className='fa fa-paper-plane' />, ' ', action]
            detail = () => {
                const rows: JSX.Element[] = []
                if (item.after instanceof Object) {
                    for (const key of Object.keys(item.after)) {
                        let value = item.after[key]
                        let skip = false
                        switch (key) {
                            case 'filteredRecipients':
                                value = <td>{value.map((x: any) => `${x.name}<${x.email}>`).join(', ')}</td>
                                break
                            case 'html':
                                value = <td dangerouslySetInnerHTML={{ __html: value }} />
                                break
                            case 'subject':
                                value = <td>{`${value}`}</td>
                                break
                            default:
                                skip = true
                                break
                        }
                        if (!skip) {
                            rows.push(<tr key={i++}><th>{GetColumn(key)}</th>{value}</tr>)
                        }
                    }
                } else {
                    console.log("History 'after' Not in expected format: " + item.after)
                }

                return <table><tbody>{rows}</tbody></table>
            }
        } else if (action === 'Create' && table === 'participants') {
            title = [<span key={i++} className='fa fa-pencil' />, ' ', participant, <b key={i++}> signed up</b>]
        } else if (item.column && item.participantId === null) {
            title = [<span key={i++} className='fa fa-map-marker' />, ' ',
            <b key={i++}>{GetColumn(item.column)}</b>, ' ', item.before || '-', ' ',
            <span key={i++} className='fa fa-arrow-right' />, ' ', item.after || '-', ' ']
        } else if (item.column && item.column === 'isDeleted' && item.after) {
            title = [<span key={i++} className='fa fa-remove' />, ' ', participant, <b key={i++}> deleted</b>]
        } else if (item.column) {
            title = [<span key={i++} className='fa fa-user' />, ' ', participant, ' ',
            <b key={i++}>{GetColumn(item.column)}</b>, ' ', item.before || '-', ' ',
            <span key={i++} className='fa fa-arrow-right' />, ' ', item.after || '-', ' ']
        } else {
            title = [<span key={i++} className='fa fa-user-plus' />, ' ', action]
        }

        if (item.userId) {
            title = title.concat([<b key={i++}> by </b>, MembersService.getMemberById(item.userId).name])
        }

        return (
            <Accordian headerClassName='history-item' id={`historyitem${item.id}`}
                title={[GetTime(item), ' ', ...title]} onDemand={detail} />
        )
    }
}

class HistoryDay extends Component<{
    items: IHistoryItem[]
    history: History
}, {
}>
{
    constructor(props: any) {
        super(props)
        this.state = {}
        BindMethods(this)
    }

    public onDetail(): JSX.Element[] {
        return this.props.items.map(i =>
                <HistoryItem key={i.id} item={i} history={this.props.history} />)
    }

    public render() {
        const stamp = GetDate(this.props.items[0])
        const id = 'historyday' + this.props.items[0].id
        const members = new Set(this.props.items
            .filter(i => i.userId).map(i => MembersService.getMemberById(i.userId).name))
        const onDetail = () => this.onDetail();

        return <Accordian key={id} id={id} headerClassName='history-day'
            title={`${stamp} ${[...members].join(', ')}`}
            onDemand={onDetail} />
    }
}

export class History extends Component<{
    trip: ITrip
    participants: IParticipant[]
}, {
    history?: IHistoryItem[]
}>
{
    constructor(props: any) {
        super(props)
        this.state = {}
    }

    public getValue(at: IHistoryItem, column: string): any {
        for (const item of this.state.history ?? []) {
            if (item.id > at.id && item.participantId === at.participantId && item.column === column) {
                return item.before
            }
        }

        if (at.participantId === null) {
            return this.props.trip[column]
        }

        const participant = this.props.participants.find((p: IParticipant) => p.id === at.participantId)

        if (participant !== undefined) {
            return participant[column]
        }

        return null
    }

    public componentDidMount() {
        TripsService.getTripHistory(this.props.trip.id)
            .then((history: IHistoryItem[]) => {
                this.setState({ history })
            })
    }

    public render() {
        const days: IHistoryItem[][] = []
        const { history } = this.state

        for (const item of history ?? []) {
            if (days.length === 0 || GetDate(item) !== GetDate(days[days.length - 1][0])) {
                days.push([])
            }

            days[days.length - 1].push(item)
        }

        return (
            <ListGroup>
                <ListGroupItem>
                    {history
                        ? days.map(day =>
                            <HistoryDay key={day[0].id} items={day} history={this} />)
                        : <Accordian id='historyspinner' headerClassName='history-day'
                            title={[Spinner, ' Loading History']} />
                    }
                </ListGroupItem>
            </ListGroup>
        )
    }
}
