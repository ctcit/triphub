import { Component } from 'react'
import * as React from 'react'
import { App } from './App'
import { Trip } from './Trip'
import { Expandable } from './Expandable'
import { IParticipant } from './Interfaces'

interface IHistoryItem {
    id : number
    timestamp : string
    action : string
    table : string
    userId : number
    tripId : number
    participantId? : number
    column? : string
    before? : string | object
    after? : string | object
}

function Pad(x : number) : string {
    return (100+x).toString().substr(1,2)
}

function GetDate(item : IHistoryItem) : string {
    const stamp = new Date(`${item.timestamp}Z`)

    return `${stamp.getFullYear()}-${Pad(stamp.getMonth()+1)}-${Pad(stamp.getDate())}`
}

function GetTime(item : IHistoryItem) : string {
    const stamp = new Date(`${item.timestamp}Z`)

    return `${Pad(stamp.getHours())}:${Pad(stamp.getMinutes())}`
}

function GetColumn(column : string) : string {
    let out = column[0].toUpperCase()

    for (let i = 1; i < column.length; i++) {
        out += (column[i] >= 'A' && column[i] <= 'Z' ? ' ' : '') + column[i]
    }

    return out
}

class HistoryItem extends Component<{
    item : IHistoryItem
    app : App
    history : History
},{}>{
    constructor(props : any){
        super(props)
        this.state = {}
    }

    public render() {
        const item = this.props.item
        const table = this.props.item.table.split('.')[1]
        const action = item.action[0].toUpperCase() + item.action.substr(1)
        const participant = item.participantId ? this.props.history.getValue(item,'name') : null
        let title: any[] = []
        let detail = null

        if (action === 'Email') {
            title = [<span key='1' className='fa fa-paper-plane'/>,' ',action]
            const rows = []
            if ( item.after instanceof Object) {
                for (const key of Object.keys(item.after)) {
                    let value = item.after[key]
                    let skip = false
                    switch (key) {
                        case 'filteredRecipients':
                            value = <td>{value.map((x:any) => `${x.name}<${x.email}>`).join(', ')}</td>
                            break
                        case 'html':
                            value = <td dangerouslySetInnerHTML={{__html: value}}/>
                            break
                        case 'subject':
                            value = <td>{`${value}`}</td>
                            break
                        default:
                            skip = true
                            break
                    }
                    if (!skip) {
                        rows.push(<tr key={key}><th>{GetColumn(key)}</th>{value}</tr>)
                    }
                }
            } else {
                console.log("History 'after' Not in expected format: "+item.after)
            }

            detail = <table>{rows}</table>
        } else if (action === 'Create' && table === 'participants') {
            title = [<span key='1' className='fa fa-pencil'/>,' ',participant,<b key='3'> signed up</b>]
        } else if (item.column && item.participantId === null) {
            title = [<span key='1' className='fa fa-map-marker'/>,' ',
                     <b key='2'>{GetColumn(item.column)}</b>,' ',item.before || '-',' ',
                     <span key='3' className='fa fa-arrow-right'/>,' ',item.after || '-',' ']
        } else if (item.column && item.column === 'isDeleted' && item.after) {
            title = [<span key='1' className='fa fa-remove'/>,' ',participant,<b key='3'> deleted</b>]
        } else if (item.column) {
            title = [<span key='1' className='fa fa-user'/>,' ',participant,' ',
                     <b key='2'>{GetColumn(item.column)}</b>,' ',item.before || '-',' ',
                     <span key='3' className='fa fa-arrow-right'/>,' ',item.after || '-',' ']
        } else {
            title = [<span key='1' className='fa fa-user-plus'/>,' ',action]
        }

        if (item.userId) {
            title = title.concat([<b key='5'> by </b>, this.props.app.getMemberById(item.userId).name])
        }

        return (
            <Expandable level={4} id={`historyitem${item.id}`} title={[GetTime(item),' ',...title]}>
                {detail}
            </Expandable>
        )
    }
}

class HistoryDay extends Component<{
    items : IHistoryItem[]
    history : History
    app : App
},{
}>
{
    constructor(props : any){
        super(props)
        this.state = {}
    }

    public render() {
        const stamp = GetDate(this.props.items[0])
        const id = 'historyday' + this.props.items[0].id
        const members = {}

        for (const item of this.props.items) {
            if (item.userId) {
                members[this.props.app.getMemberById(item.userId).name] = true
            }
        }

        return (
            <Expandable key={id} id={id} level={3} title={`${stamp} ${Object.keys(members).join(', ')}`}>
                {this.props.items.map((child : IHistoryItem) =>
                    <HistoryItem key={child.id} item={child} app={this.props.app} history={this.props.history}/>)}
            </Expandable>
        )
    }
}

export class History extends Component<{
    owner : Trip
    app : App
},{
    history : IHistoryItem[]
}>
{
    constructor(props : any){
        super(props)
        this.state = {history : []}
    }

    public getValue(at : IHistoryItem, column : string) : any {
        for (const item of this.state.history) {
            if (item.id > at.id && item.participantId === at.participantId && item.column === column) {
                return item.before
            }
        }

        if (at.participantId === null) {
            return this.props.owner.state.trip[column]
        }
        
        const participant = this.props.owner.state.participants.find((p : IParticipant) => p.id === at.participantId)

        if (participant !== undefined) {
            return participant[column]
        }

        return null
    }

    public componentDidMount(){
        this.props.app.triphubApiCall('GET', this.props.owner.props.href + '/history')
            .then((history : IHistoryItem[]) => {
                this.setState({history})
            })
    }

    public render() {
        const days : IHistoryItem[][] = []

        for (const item of this.state.history) {
            if (days.length === 0 || GetDate(item) !== GetDate(days[days.length-1][0])) {
                days.push([])
            } 

            days[days.length-1].push(item)
        }

        return days.map((day : IHistoryItem[])=> 
                            <HistoryDay key={day[0].id} items={day} app={this.props.app} history={this}/>)
    }
}
