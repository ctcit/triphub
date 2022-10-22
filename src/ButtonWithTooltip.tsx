import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import { Component } from 'react';
import { Button, Tooltip } from 'reactstrap';
import type { Placement } from '@popperjs/core';

export class ButtonWithTooltip extends Component<{
    id: string,
    color?: string,
    disabled?: boolean,
    onClick: () => void,
    tooltipText: string,
    placement?: Placement,
    children?: React.ReactNode
},{
    tooltipOpen: boolean ,
}>{
    constructor(props:any) {
        super(props);

        this.state = { 
            tooltipOpen: false
        };
    }

    public render(){
        const onClick = (event: any) => { event.stopPropagation(); this.props.onClick() };
        const toggle = () => { this.setState( { tooltipOpen: !this.state.tooltipOpen }) };

        return <div>
            <div id={this.props.id}>
                <Button color={this.props.color} disabled={this.props.disabled} onClick={onClick} >{this.props.children}</Button>
            </div>
            <Tooltip target={this.props.id} isOpen={this.state.tooltipOpen} placement={this.props.placement} toggle={toggle}>{this.props.tooltipText}</Tooltip>
        </div>
    }
}