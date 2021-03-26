import { Component } from 'react'
import * as React from 'react'
import Tooltip from 'reactstrap/lib/Tooltip'

export class ToolTipIcon extends Component<{
    tooltip: any 
    id: string
    icon?: string 
    className? : string
},{
    isOpen:boolean
}>{
    constructor(props : any){
        super(props)
        this.state = {isOpen: false}
    }

    public render() {
        const toggle = () => this.setState({isOpen: !this.state.isOpen})
        const id = `tooltipicon_${this.props.icon || this.props.id}_${this.props.id}`
        return [
            this.props.icon
                ? <span key={this.props.id} id={id} className={`fas fa-${this.props.icon} ${this.props.className} px-1`}/>
                : <span key={this.props.id} id={id} className={`px-1 ${this.props.className}`}>{this.props.children}</span>,
            <Tooltip key={this.props.id + '_tooltip'} isOpen={this.state.isOpen} target={id} toggle={toggle}>
                {this.props.tooltip}
            </Tooltip>
        ]
    }
}
