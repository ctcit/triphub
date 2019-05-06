import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { Component } from 'react';
import * as React from 'react';
import { Button, Collapse  } from 'reactstrap';
import './index.css';
import { ToolTipIcon } from '.';

export class Expandable extends Component<{
    id : string
    buttons? : any
    level? : number
    expanded? : boolean
    title? : any
    tablerow? : any
    expandClassName? : string
    ondemand?: ()=>any
},{
    expanded : boolean
    showMenu : boolean
    demanded? : any
}> {
constructor(props: any){
    super(props)
    this.state = {expanded: props.expanded, showMenu: props.expanded}
}

public render(){
    const toggle = () => this.setState({expanded: !this.state.expanded, demanded: this.state.demanded || (this.props.ondemand && this.props.ondemand())})
    const toggleMenu = () => this.setState({showMenu: !this.state.showMenu})
    const onMouseEnter = () => this.setState({showMenu: true})
    const onMouseLeave = () => this.setState({showMenu: false})
    const collapse = <Collapse key={'collapse' + this.props.id} isOpen={this.state.expanded} className='noprint'>{this.state.demanded || this.props.children}</Collapse>
    const button = <Button key='button' color='link' onClick={toggle} type='button'>{this.state.expanded ? '◢' : '▶'}</Button>

    if (this.props.tablerow) {
        return [
            <tr key={'exp' + this.props.id} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                <td className={this.props.expandClassName}>{button}</td>
                {this.props.tablerow}
            </tr>,
            <tr key={'expbody' + this.props.id}>
                <td style={{padding: 0}}/>
                <td colSpan={9} style={{padding: 0}}>{collapse}</td>
            </tr>,
            <tr key={'expodd' + this.props.id}/>
        ]

    } else {
        const HLevel = `h${this.props.level || 1}`

        return [
            <HLevel key={'exp' + this.props.id} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className='noprint'>
                {button}
                <span key='title' onClick={toggle}>{this.props.title}</span>
                <span key='togglemenu' onClick={toggleMenu} hidden={(this.props.buttons||[]).length === 0}>
                    <ToolTipIcon icon='ellipsis-h' tooltip='Toggle menu' id={this.props.id}/>
                </span>
                <span key='buttons' hidden={!this.state.expanded && !this.state.showMenu}>{this.props.buttons}</span>
            </HLevel>,
            collapse
        ]
    }
}
}
