import { Component } from 'react';
import * as React from 'react';
import { App } from './App';
import { Trip } from './Trip';
import { Expandable } from './Expandable';
import { IParticipant, IHistoryItem, IMember } from './Interfaces';
import { TitleFromId } from './Utilities';
import { Spinner } from 'src';

function Pad(x: number): string {
    return (100 + x).toString().substr(1, 2)
}

function GetDate(item: IHistoryItem): string {
    const stamp = new Date(`${item.timestamp}Z`)

    return `${stamp.getFullYear()}-${Pad(stamp.getMonth() + 1)}-${Pad(stamp.getDate())}`
}

function GetTime(item: IHistoryItem): string {
    const stamp = new Date(`${item.timestamp}Z`)

    return `${Pad(stamp.getHours())}:${Pad(stamp.getMinutes())}`
}

class HistoryItem extends Component<{
    item: IHistoryItem
    app: App
    history: History
}, {}>{
    constructor(props: any) {
        super(props)
        this.state = {}
    }

    public render() {
        const item = this.props.item
        const table = this.props.item.table.split('.')[1]
        const action = TitleFromId(item.action)
        const participant = item.participantId ? this.props.history.getValue(item, 'name') : null
        let title: any[] = []
        let detail = null
        let key = 1

        const historyValue = (v: any): any =>
            v === true ? 'Yes' : v === false ? 'No' :
                v === null || v === '' ? <span key={key++} className='blank'>Blank</span> : v

        if (action === 'Email') {
            title = [<span key={key++} className='fa fa-paper-plane' />, ' ', action]
            detail =
                <table className='changehistory'>
                    <tbody>
                        <tr>
                            <th>Subject:</th>
                            <td>{item.after.subject}</td>
                        </tr>
                        <tr>
                            <th>Recipients:</th>
                            <td>
                                {[
                                    ...(item.after.recipients as IMember[] || []).map(m => `${m.name} <${m.email}>;`),
                                    ...(item.after.filteredRecipients as IMember[] || []).map(m => `${m.name} <${m.email}> (filtered)`)
                                ].join('; ')}
                            </td>
                        </tr>
                        <tr>
                            <th>Body:</th>
                            <td dangerouslySetInnerHTML={{ __html: item.after.html || "" }} />
                        </tr>
                    </tbody>
                </table>
        } else if (action === 'Create' && table === 'participants') {
            title = [<span key={key++} className='fa fa-pencil' />, ' ', participant, <b key={key++}> signed up</b>]
        } else if (item.column && item.participantId === null) {
            title = [<span key={key++} className='fa fa-map-marker' />, ' ',
            <b key={key++}>{TitleFromId(item.column)}</b>, ' ', historyValue(item.before), ' ',
            <span key={key++} className='fa fa-arrow-right' />, ' ', historyValue(item.after), ' ']
        } else if (item.column && item.column === 'isDeleted' && item.after) {
            title = [<span key={key++} className='fa fa-remove' />, ' ', participant, <b key={key++}> deleted</b>]
        } else if (item.column) {
            title = [<span key={key++} className='fa fa-user' />, ' ', participant, ' ',
            <b key={key++}>{TitleFromId(item.column)}</b>, ' ', historyValue(item.before), ' ',
            <span key={key++} className='fa fa-arrow-right' />, ' ', historyValue(item.after), ' ']
        } else {
            title = [<span key={key++} className='fa fa-user-plus' />, ' ', action]
        }

        if (item.userId) {
            title = title.concat([<b key='5'> by </b>, this.props.app.getMemberById(item.userId).name])
        }

        return (
            <Expandable level={6} id={`historyitem${item.id}`} title={[GetTime(item), ' ', ...title]}>
                {detail}
            </Expandable>
        )
    }
}

class HistoryDay extends Component<{
    items: IHistoryItem[]
    history: History
    app: App
}, {
}>
{
    constructor(props: any) {
        super(props)
        this.state = {}
    }

    public render() {
        const stamp = GetDate(this.props.items[0])
        const id = 'historyday' + this.props.items[0].id
        const members = {}

        for (const item of this.props.items) {
            if (item.userId) {
                members[this.props.app.getMemberById(item.userId).name] = true;
            }
        }

        return (
            <Expandable key={id} id={id} level={3} title={`${stamp} ${Object.keys(members).join(', ')}`}>
                {this.props.items.map((child: IHistoryItem) =>
                    <HistoryItem key={child.id} item={child} app={this.props.app} history={this.props.history} />)}
            </Expandable>
        )
    }
}

export class History extends Component<{
    owner: Trip
    app: App
}, {
    history?: IHistoryItem[]
}>
{
    constructor(props: any) {
        super(props)
        this.state = {  }
    }

    public getValue(at: IHistoryItem, column: string): any {
        for (const item of this.state.history || []) {
            if (item.id > at.id && item.participantId === at.participantId && item.column === column) {
                return item.before
            }
        }

        if (at.participantId === null) {
            return this.props.owner.state.trip[column]
        }

        const participant = this.props.owner.state.participants.find((p: IParticipant) => p.id === at.participantId)

        if (participant !== undefined) {
            return participant[column]
        }

        return null
    }

    public componentDidMount() {
        this.props.app.apiCall('GET', this.props.owner.props.href + '/history')
            .then((items: IHistoryItem[]) => {
                const history = items.map(i => ({ ...i, ...(i.action === 'email' ? { ...i.after } : {}) }))
                this.setState({ history })
            })
    }

    public render() {
        if (!this.state.history){
            return <h3>Loading history {Spinner}</h3>
        }

        const days: IHistoryItem[][] = []

        for (const item of this.state.history) {
            if (days.length === 0 || GetDate(item) !== GetDate(days[days.length - 1][0])) {
                days.push([]);
            }

            days[days.length - 1].push(item)
        }

        return days.map((day: IHistoryItem[]) =>
            <HistoryDay key={day[0].id} items={day} app={this.props.app} history={this} />)
    }
}
