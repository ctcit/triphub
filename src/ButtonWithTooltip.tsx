import * as L from 'leaflet';
import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import * as React from 'react';
import { Component } from 'react';
import { Button, Tooltip } from 'reactstrap';
import * as Popper from 'popper.js';

export class ButtonWithTooltip extends Component<{
    id: string,
    color?: string,
    disabled?: boolean,
    onClick: () => void,
    tooltipText: string,
    placement?: Popper.Placement
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
        const onClick = () => this.props.onClick();
        const toggle = () => { this.setState( { tooltipOpen: !this.state.tooltipOpen }) };

        return <div>
            <div id={this.props.id}>
                <Button color={this.props.color} disabled={this.props.disabled} onClick={onClick} >{this.props.children}</Button>
            </div>
            <Tooltip target={this.props.id} isOpen={this.state.tooltipOpen} placement={this.props.placement} toggle={toggle}>{this.props.tooltipText}</Tooltip>
        </div>
    }
}