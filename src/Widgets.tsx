import * as React from 'react';

export const Spinner = <span className='fa fa-spinner fa-spin' key='spinner'/>

export const FullWidthLoading = () => (
    <div className="full-width-loading-wrapper">
        <div className="full-width-loading">
            <span className='fa fa-spinner fa-spin' key='spinner'/>
        </div>
    </div>
);