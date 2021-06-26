import * as React from "react";
import { IArchivedRoute } from "src/Interfaces";

export class ManageRoutesUtilities {
    public static TripLink(route: IArchivedRoute): JSX.Element | null {
        const tripLink = 
            route.tripHubId > 0 ? "https://ctc.org.nz/index.php/trip-signup#/trips/" + route.tripHubId :
            route.tripReportsId > 0 ? "https://ctc.org.nz/index.php/trip-reports?goto=tripreports%2F" + route.tripReportsId :
            route.ctcRoutesId > 0 ? "https://ctc.org.nz/index.php/route-archivenew" : // not ideal; can't specify actual route id
            null;
        return tripLink ? <a href={tripLink} target="_blank">{route.title}</a> : <span>{route.title}</span>
    }

    public static TripSourceAndOriginalSource(route: IArchivedRoute): JSX.Element | null {
        let result = route.source;
        if (result === "Routes") {
            const originalSource = 
            route.tripHubId > 0 ? "TripHub" :
            route.tripReportsId > 0 ? "TripReports" :
            route.ctcRoutesId > 0 ? "CtcRoutes" :
            null;
            if (originalSource !== null) {
                result = result + "/" + originalSource;
            }
        }
        return <span>{result}</span>
    }
   
}