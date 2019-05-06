import { Component } from 'react';
import * as React from 'react';
import { App } from './App';
import { Trip } from './Trip';
import { Expandable } from './Expandable';

interface IHistoryItem {
    id : number
    editid : number
    timestamp : string
    action : string
    userid : number
    tripid : string
    participantid : number | null
    before : string | null
    after : string | null
    email : string | null
}

function GetTime(item : IHistoryItem) : string {
    const pad = (x : number) : string => (100+x).toString().substr(1,2)
    const stamp = new Date(`${item.timestamp}Z`)

    return `${stamp.getFullYear()}-${pad(stamp.getMonth()+1)}-${pad(stamp.getDate())} ${pad(stamp.getHours())}:${pad(stamp.getMinutes())}`
}

class HistoryItem extends Component<{
    item : IHistoryItem
    app : App
},{}>{
    constructor(props : any){
        super(props)
        this.state = {}
    }

    public render() {
        const item = this.props.item
        const id = `historyitem_${item.id}`
        const before = JSON.parse(item.before || '{}') 
        const after = JSON.parse(item.after || '{}')
        const email = JSON.parse(item.email || '{}')
        const changes = []
        let title = `${GetTime(item)} ${item.action} ${after.name || ''}`

        if (item.email) {
            title += " (Email)"
            changes.push(
                <tr key='email'><th>Email:</th><td dangerouslySetInnerHTML={{__html:email.html}}/></tr>
            )
        }

        for (const key of Object.keys(after)) {
            const beforeVal = before[key] || ''
            const afterVal = after[key]
            
            if (beforeVal !== afterVal) {
                changes.push(
                    <tr key={key + item.id}>
                        { after.name ? [<th key='pth'>Participant:</th>,<td key='ptd'>{after.name}</td>] : null}
                        <th>Field:</th><td>{key}</td>
                        <th>After:</th><td>{afterVal}</td>
                    </tr>)
                if (item.before) {
                    changes.push(
                        <tr key={key + item.id + 'before'}>
                            { item.participantid ? [<th key='pth'/>,<td key='ptd'/>] : null}
                            <th/><td/>
                            <th>Before:</th><td>{beforeVal}</td>
                        </tr>)
                }
            }
        }

        return (
            <Expandable key={id} id={id} title={title} level={4}>
                <table className='changehistory'>
                    <tbody>{changes}</tbody>
                </table>
            </Expandable>
        )
    }
}

class HistoryGroup extends Component<{
    items : IHistoryItem[]
    app : App
},{
}>
{
    constructor(props : any){
        super(props)
        this.state = {}
    }

    public render() {
        const item = this.props.items[0]
        const id = 'historygroup_' + item.id
        const member = this.props.app.getMemberById(item.userid)

        return (
            <Expandable key={id} id={id} level={3} title={`${GetTime(item)} ${member.name}`}>
                {this.props.items.map((child : IHistoryItem) =>
                    <HistoryItem key={child.id} item={child} app={this.props.app}/>)}
            </Expandable>
        )
    }
}

export class ChangeHistory extends Component<{
    owner : Trip
    app : App
},{
    history : IHistoryItem[][]
}>
{
    constructor(props : any){
        super(props)
        this.state = {history : []}
    }

    public componentDidMount(){
        this.props.app.apiCall('GET', this.props.app.state.tripHref + '/change_history')
            .then((data : IHistoryItem[]) => {
                data.sort((a : IHistoryItem, b : IHistoryItem) => a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0)

                const history : IHistoryItem[][] = []

                for (const item of data) {
                    if (history.length === 0 || item.editid === 0 || item.editid !== history[history.length-1][0].editid) {
                        history.push([]);
                    } 

                    history[history.length-1].push(item)
                }

                this.setState({history})
            })
    }

    public render() {
        return this.state.history.map((items : IHistoryItem[])=>
                <HistoryGroup key={items[0].id} items={items} app={this.props.app}/>)
    }
}
