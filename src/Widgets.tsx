import { Alert, Badge, UncontrolledAlert } from 'reactstrap'

export const Spinner = <span className='fa fa-spinner fa-spin' key='spinner' />
export const Done = <span className='fa fa-check' key='done' />

export const FullWidthLoading = () => (
    <div className="full-width-loading-wrapper">
        <div className="full-width-loading">
            <span className='fa fa-spinner fa-spin' key='spinner' />
        </div>
    </div>
)

export const Pill = (props: any) => (
    <Badge pill={true} className="px-3 py-1 my-2 pill">
        {props.children}
    </Badge>
)

export const AdminHint = (props: any) => (
    <Alert color="warning" className="mt-3">
        {props.children}
    </Alert>
)

export const Notification = (props: any) => (
    <UncontrolledAlert color={props.color}>{props.children}</UncontrolledAlert>
)
