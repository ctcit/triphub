import * as React from 'react';
import Badge from 'reactstrap/lib/Badge';

export const Spinner = <span className='fa fa-spinner fa-spin' key='spinner'/>

export const FullWidthLoading = () => (
    <div className="full-width-loading-wrapper">
        <div className="full-width-loading">
            <span className='fa fa-spinner fa-spin' key='spinner'/>
        </div>
    </div>
)

export const TripHubPill = (props:any) => (
    <Badge pill={true} className="px-3 py-1 my-2 pill">
    {props.children}
    </Badge>
)
