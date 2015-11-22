System.log("Remove LUN - Synch Operator Data");

try  {		
	if(Nodes.length > 1){ //Is cluster cannot delete Lun unmap only from LunMap table		
		if(DRNodes[0] != 0){ //Case when Prod Nodes are unmapped and a single node exists in DR
			for(var i=0; i<Lun_Delete.length; i++){
				var deleteQuery = "DELETE FROM Lun WHERE FarmObjectId = "+DRNodes[0]+" AND LunScsiId = "+Lun_Delete[i].ScsiId+" AND Size = "+Lun_Delete[i].Size+";"; 
				var result = cmdb.executeCustomQuery(deleteQuery);
		
				if ( result > 0 )  {
					System.log( "Row with FarmObjectId ("+DRNodes[0]+") was deleted from table Lun and LunMap successfully" );
				} else  {
					System.error( "Row delete failed in table Lun and LunMap" );
				}	
			}
		}																																
																																																																																											
		for(var i=0; i<Lun_UnMap.length; i++){
			if(Lun_UnMap[i].LunId > -1){
				var deleteQuery = "DELETE FROM LunMap WHERE LunId = "+Lun_UnMap[i].LunId+" AND FarmObjectId = "+Lun_UnMap[i].FarmObjectId+";"; 
				var result = cmdb.executeCustomQuery(deleteQuery);
				if ( result > 0 )  {
					System.log( "Row with LunId ("+Lun_UnMap[i].LunId+") and FarmObjectId ("+Lun_UnMap[i].FarmObjectId+") was deleted from table LunMap successfully" );
				} else  {
					System.error( "Row delete failed in table LunMap" );
				}
			}
		}																																																																																									
	}
	else if (Nodes.length == 1){ // Is standalone server or the last node of a cluster
		if(RemoveAll){
			var deleteQuery = "DELETE FROM Lun WHERE FarmObjectId = "+Nodes[0]+";"; 
			var result = cmdb.executeCustomQuery(deleteQuery);
		
			if ( result > 0 )  {
				System.log( "Row with FarmObjectId ("+Nodes[0]+") was deleted from table Lun and LunMap successfully" );
			} else  {
				System.error( "Row delete failed in table Lun and LunMap" );
			}
			
			if(DRNodes[0] != 0){
				var deleteQuery = "DELETE FROM Lun WHERE FarmObjectId = "+DRNodes[0]+";"; 
				var result = cmdb.executeCustomQuery(deleteQuery);
		
				if ( result > 0 )  {
					System.log( "Row with FarmObjectId ("+DRNodes[0]+") was deleted from table Lun and LunMap successfully" );
				} else  {
					System.error( "Row delete failed in table Lun and LunMap" );
				}			
			}
		}
		else if(!RemoveAll){
			var deleteQuery = "DELETE FROM Lun WHERE FarmObjectId = "+Nodes[0]+" AND UidSerial = '"+Lun_Delete[0].UidSerial+"';"; 
			var result = cmdb.executeCustomQuery(deleteQuery);
		
			if ( result > 0 )  {
				System.log( "Row with FarmObjectId ("+Nodes[0]+") was deleted from table Lun and LunMap successfully" );
			} else  {
				System.error( "Row delete failed in table Lun and LunMap" );
			}	
			
			if(DRNodes[0] != 0){
				var deleteQuery = "DELETE FROM Lun WHERE FarmObjectId = "+DRNodes[0]+" AND LunScsiId = "+Lun_Delete[1].ScsiId+" AND Size = "+Lun_Delete[1].Size+";"; 
				var result = cmdb.executeCustomQuery(deleteQuery);
		
				if ( result > 0 )  {
					System.log( "Row with FarmObjectId ("+DRNodes[0]+") was deleted from table Lun and LunMap successfully" );
				} else  {
					System.error( "Row delete failed in table Lun and LunMap" );
				}	
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
