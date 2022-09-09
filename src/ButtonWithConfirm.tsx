import 'src/leaflet-editable/leaflet-editable.js';
import 'leaflet-gpx';
import * as React from 'react';
import { Component } from 'react';
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle, Tooltip } from 'reactstrap';
import type { Placement } from '@popperjs/core';

export class ButtonWithConfirm extends Component<{
    id: string,
    color?: string,
    disabled?: boolean,
    onClick: () => void,
    tooltipText: string,
    placement?: Placement,
    confirmText: string,
    children?: React.ReactNode;
},{
    tooltipOpen: boolean,
    cancelDropdownOpen: boolean
}>{
    constructor(props:any) {
        super(props);

        this.state = { 
            tooltipOpen: false,
            cancelDropdownOpen: false
        };
    }

    public render(){
        const onClick = () => this.props.onClick();
        const toggle = () => { this.setState( { tooltipOpen: !this.state.tooltipOpen }) };
        const onCancelDropdownToggle = () => { this.setState({ cancelDropdownOpen: !this.state.cancelDropdownOpen }); }

        return <div>
            <div id={this.props.id}>
                <ButtonDropdown color={this.props.color} disabled={this.props.disabled} drop={'right'} isOpen={this.state.cancelDropdownOpen} toggle={onCancelDropdownToggle}>
                    <DropdownToggle disabled={this.props.disabled} caret={false}>{this.props.children}</DropdownToggle>
                    <DropdownMenu>
                        <DropdownItem color="red" onClick={onClick}>{this.props.confirmText}</DropdownItem>
                    </DropdownMenu>
                </ButtonDropdown>
            </div>
            <Tooltip target={this.props.id} isOpen={this.state.tooltipOpen} placement={this.props.placement} toggle={toggle}>{this.props.tooltipText}</Tooltip>
        </div>
    }
}