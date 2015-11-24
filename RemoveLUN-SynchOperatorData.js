System.log("Remove LUN - Synch Operator Data");

try  {
	
	if(Lun_Delete && Lun_Delete.length > 0){
		for(var i=0; i<Lun_Delete.length; i++){
			var deleteQuery = "DELETE FROM Lun WHERE Id = "+Lun_Delete[i].LunId+";"; 
			var result = cmdb.executeCustomQuery(deleteQuery);
		
			if ( result > 0 )  {
				System.log( "Row with Id ("+Lun_Delete[i].LunId+") was deleted from table Lun and LunMap successfully" );
			} else  {
				System.error( "Row delete failed in table Lun and LunMap" );
			}	
		}	
	}
	
	if(Lun_UnMap && Lun_UnMap.length > 0){
		for(var i=0; i<Lun_UnMap.length; i++){
			var deleteQuery = "DELETE FROM LunMap WHERE LunId = "+Lun_UnMap[i].LunId+" AND FarmObjectId = "+Lun_UnMap[i].FarmObjectId+";"; 
			var result = cmdb.executeCustomQuery(deleteQuery);
			if ( result > 0 )  {
				System.log( "Row with LunId ("+Lun_UnMap[i].LunId+") and FarmObjectId ("+Lun_UnMap[i].FarmObjectId+") was deleted from table LunMap successfully" );
			} else  {
				System.error( "Row delete failed in table LunMap" );
			}			
		}	
	}	
	insRequest(vraRequestId, "CURRENT_TIMESTAMP", user, owner, ProjectId, "COMPLETED", "Storage SAN", tenant);
	
} catch(ex){
	throw "Remove LUN - Synch Operator Data - ERROR: "+ex;
}
																																																																																																																																																																																																																					
function insRequest(RequestNumber, CompletedDate, CreatedBy, UpdatedBy, ProjectId, state, Office, Tenant) {

	var CreatedDate			= "CURRENT_TIMESTAMP";
	var Element 			= workflow.name;
	
	var sqlStatement = "INSERT INTO Request(RequestId, Element, CreatedDate, CompletedDate, CreatedBy, UpdatedBy, ProjectId, Action_State, Office, Tenant) OUTPUT Inserted.Id ";
	sqlStatement = sqlStatement + "VALUES(";
    sqlStatement = sqlStatement + "'"+RequestNumber+"',";
	sqlStatement = sqlStatement + "'"+Element+"',";
	sqlStatement = sqlStatement + ""+CreatedDate+",";
	sqlStatement = sqlStatement + ""+CompletedDate+",";
	sqlStatement = sqlStatement + "'"+CreatedBy+"',";
	sqlStatement = sqlStatement + "'"+UpdatedBy+"',";
	sqlStatement = sqlStatement + ""+ProjectId+",";
	sqlStatement = sqlStatement + "'"+state+"',";
	sqlStatement = sqlStatement + "'"+Office+"',";
	sqlStatement = sqlStatement + "'"+Tenant+"'";
	sqlStatement = sqlStatement + ");";
	
	System.log( "sqlStatement >" + sqlStatement );
	var returnId;
	var result = cmdb.readCustomQuery(sqlStatement);
		
	if( result.length == 1 ) {
		returnId = result[0].getProperty("Id");
		System.log( "Row ("+RequestNumber+") inserted in table successfully" );
	}
	else{
        System.error( "Row insertion in table failed" );
    }	
	return returnId;
}
