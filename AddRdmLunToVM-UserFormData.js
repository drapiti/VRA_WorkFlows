System.log(workflow.name + " - User Form Data");
 
try  {
	//The Add RDM LUN to VM workflow assumes that the RDM cluster is in the format ###-RDM-PP-01
	//and the DR RDM cluster is in the format ###-RDM-SD-01 where ### represents the tenant.
	//In general by default an RDM LUN will have a DR LUN since the RDM cluster is of Scenario A
	//however the operator can overide and remove DR LUNs and modify the scenario of the single LUN
	//if the LUN is destined to a different scenario. Example scenario D with no DR.

	user			= __asd_requestedFor;
    user			= user.split("@");
	user			= user[0];

	Server_Data		= new Array();
	Data_LUNs 		= new Array();
	Port_Data		= new Array();
	Nodes			= new Array();
	DRNodes			= new Array();
	var ClusterId	= new Array();
	var Cluster			= tenant+"-RDM-PP-01";
	var ClusterDR		= tenant+"-RDM-SD-01";
									
	var selectQuery = "SELECT F.Id, C.Id as ClusterId FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id WHERE C.Name = '"+Cluster+"' ORDER BY F.Name;";	
	System.log("selectQuery:"+selectQuery);
		
	var res = cmdb.readCustomQuery(selectQuery);
		
	if(res){		
		for(var x in res){
			Nodes[x] 		= res[x].getProperty("Id");
			ClusterId[0]	= res[x].getProperty("ClusterId");
		}		
	}																				
	
	var selectQuery = "SELECT F.Id, C.Id as ClusterId FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id WHERE C.Name = '"+ClusterDR+"' ORDER BY F.Name;";	
	System.log("selectQuery:"+selectQuery);
		
	var res = cmdb.readCustomQuery(selectQuery);
		
	if(res){		
		for(var y in res){
			DRNodes[y] 			= res[y].getProperty("Id");
			ClusterId[1]		= res[y].getProperty("ClusterId");
		}		
	}
	
	for(var i=0; i<ClusterId.length; i++){				
		var selectQuery = "SELECT (F.Name) as Hostname, F.Serial, (SL.Name) as ServiceLevel, F.ServiceProfile FROM FarmObject as F JOIN ServiceLevel as SL ON SL.Id=F.ServiceLevelId WHERE F.ClusterId = "+ClusterId[i]+" ORDER BY F.Name;";	
		System.log("selectQuery:"+selectQuery);
				
		var res = cmdb.readCustomQuery(selectQuery);	
		
		if(res) {
			for(var k in res){			
				var server 				= new Object();
				server.ForeignBank		= tenant;
				server.Hostname 		= res[k].getProperty("Hostname");
				server.Serial 			= res[k].getProperty("Serial");
				server.Scenario 		= res[k].getProperty("ServiceLevel");
				server.ServiceProfile 	= res[k].getProperty("ServiceProfile");
				Server_Data.push(server);		
			}
		}
			
		var selectQuery = "SELECT (F.Name) as Hostname, P.PortNo, P.WWPN, P.Interface FROM FarmObject as F JOIN Port as P ON F.Id=P.FarmObjectId WHERE F.ClusterId = "+ClusterId[i]+" AND P.Type='Storage' AND P.PortNo NOT LIKE '%Boot%' ORDER BY F.Name;";	
		System.log("selectQuery:"+selectQuery);
				
		var res = cmdb.readCustomQuery(selectQuery);
		if(res){		
			for(var x in res){
				var port 			= new Object();
				port.Hostname		= res[x].getProperty("Hostname");
				port.PortNo 		= res[x].getProperty("PortNo");
				port.WWPN 			= res[x].getProperty("WWPN"); 								
				port.Interface		= res[x].getProperty("Interface"); 
				Port_Data.push(port);
			}		
		}		
	}
	
	if(Data_LUNs_Size && Data_LUNs_Size.length > 0) {
		for(var z=0; z<Data_LUNs_Size.length; z++) {			
			var datalun 						= new Object();				
			datalun.UidSerial 					= "-";
			datalun.LunLabel 					= "-";
			datalun.LunScsiId 					= -1;
			datalun.LunScenario					= "-";
			datalun.VirtualMachineRawDeviceMap	= Hostname;
			datalun.Size			 			= Data_LUNs_Size[z];
			Data_LUNs.push(datalun);
		}
	}	
	
	if(Data_LUNs_Size && Data_LUNs_Size.length > 0) {
		for(var z=0; z<Data_LUNs_Size.length; z++) {			
			var datalun 						= new Object();				
			datalun.UidSerial 					= "-";
			datalun.LunLabel 					= "-";
			datalun.LunScsiId 					= -1;
			datalun.LunScenario					= "-";
			datalun.VirtualMachineRawDeviceMap	= "DR-"+Hostname;
			datalun.Size			 			= Data_LUNs_Size[z];
			Data_LUNs.push(datalun);
		}
	}		
		
	var ProjectId = getID("Project", "ProjectCode", ProjectCode);			
	
	for each (var customerAdmin in customerAdmins){
		if(tenant == customerAdmin.tenant){
			customer_ldapUser = customerAdmin.admins;
		}
	}
	
	var vcac_cafeHost;
	for each (var cafeHost in cafeHosts){
		if(tenant == cafeHost.tenant){
			vcac_cafeHost = cafeHost.vCacHost;
		}
	}
	
	var req = vCACCAFEEntitiesFinder.getCatalogItemRequest(vcac_cafeHost, __asd_catalogRequestId);  	 	
	var vraRequestId = req.requestNumber;
	System.log(vraRequestId);
					
	insRequest(vraRequestId, "0000-00-00", user, user, ProjectId, state, "Storage Approval", tenant); 										   		
	
} catch( ex )  {
	throw workflow.name + " - Error: " + ex;
} 


function getFarmObjectId(hostname, serial) {
	
	var selectQuery = "SELECT Id FROM FarmObject WHERE Name = '"+hostname+"' AND Serial = '" + serial + "';";	
	System.log( "selectQuery >" + selectQuery );
	
	var result = cmdb.readCustomQuery(selectQuery);

	var returnId;
	if(result.length == 1) {
		returnId = result[0].getProperty("Id");
	}	
	return returnId;
}

function getID(tableName, param, value) {
	
	var selectQuery = "SELECT Id FROM " + tableName + " WHERE " + param + " = '" + value + "';"; 
	
	System.log( "selectQuery >" + selectQuery );
	
	var result = cmdb.readCustomQuery(selectQuery);
	System.log( "result >" + result );
	
	var returnId;
	if(result.length == 1) {
		returnId = result[0].getProperty("Id");
	}
	
	return returnId;
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
