import 'bootstrap/dist/css/bootstrap.min.css';
import { Component } from 'react';
import * as React from 'react';
import { Collapse  } from 'reactstrap';
import './index.css';

export class AccordianTableRow extends Component<{
    id : string
    expanded? : boolean
    tablerow : JSX.Element[]
    expandClassName? : string
},{
    expanded : boolean
}> {
    constructor(props: any){
        super(props)
        this.state = {expanded: props.expanded}
    }

    public render() {
        const toggle = () => this.setState({expanded: !this.state.expanded})

        return [
            <tr key={'exp' + this.props.id}>
                {this.props.tablerow}
                <td className={this.props.expandClassName}>
                    <span onClick={toggle} className={'expandable-table-row-expand ' + (this.state.expanded ? 'fa fa-chevron-up' : 'fa fa-chevron-down')}/>
                </td>
            </tr>,
            <tr key={'expodd' + this.props.id}/>,
            <tr key={'expbody' + this.props.id}>
                <td style={{padding: 0}}/>
                <td colSpan={this.props.tablerow.length+1} style={{padding: 0}}>
                    <Collapse key={'collapse' + this.props.id} isOpen={this.state.expanded} className='noprint'>
                            {this.props.children}
                    </Collapse>
                </td>
            </tr>]
    }
}