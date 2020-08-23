import 'bootstrap/dist/css/bootstrap.min.css';
import { Component } from 'react';
import * as React from 'react';
import { Button, Collapse  } from 'reactstrap';
import './index.css';
import { ToolTipIcon } from './ToolTipIcon';

export class Expandable extends Component<{
    id : string
    buttons? : any
    level? : number
    expanded? : boolean
    title? : any
    expandClassName? : string
    ondemand?: ()=>any
    showMenu?: boolean
},{
    expanded : boolean
    showMenu : boolean
    demanded? : any
}> {
constructor(props: any){
    super(props)
    this.state = {expanded: props.expanded, showMenu: props.expanded || props.showMenu}
}

    public render(){
        const toggle = () => this.setState({expanded: !this.state.expanded, demanded: this.state.demanded || (this.props.ondemand && this.props.ondemand())})
        const toggleMenu = () => this.setState({showMenu: !this.state.showMenu})
        const onMouseEnter = () => this.setState({showMenu: true})
        const onMouseLeave = () => this.setState({showMenu: false})
        const collapse = <Collapse key={'collapse' + this.props.id} isOpen={this.state.expanded} className='noprint'>
                            {this.state.demanded || this.props.children}
                        </Collapse>
        const button = <Button key='button' color='link' onClick={toggle} type='button' style={{width:'2em'}}>
                            {this.state.demanded || this.props.children ? (this.state.expanded ? '◢' : '▶') : ' '}
                        </Button>

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
