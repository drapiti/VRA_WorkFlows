System.log("Remove LUN - User Form Data");

try  {

	user		= __asd_requestedFor;
	user		= user.split("@");
	user		= user[0];
	
	Lun_Delete 	= new Array(); 
	Lun_UnMap	= new Array();
	
	Server_Data = new Array();
	
	Nodes	 	= new Array();	
	DRNodes	 	= new Array();
		
	//Define Prod and DR Naming Convention
	if(tenant != "ISP"){
		if(Hostname.indexOf("OVM-PP") == -1){
			var DRHostname 	= "DR-"+Hostname;
			System.log("DRHostname:"+DRHostname);	
		}
		else {
			var DRHostname	= Hostname;
			DRHostname = DRHostname.split("OVM-PP").join("OVM-SD"); 
			System.log("DRHostname:"+DRHostname);
		}
		if(Cluster.indexOf("OVM-PP-") == -1 && Cluster.indexOf("STANDALONE") == -1){
			var DRCluster	= "DR-"+Cluster;
			System.log("DRCluster:"+DRCluster);
		}
		else {
			var DRCluster 	= Cluster;
			DRCluster 		= DRCluster.split("OVM-PP-").join("OVM-SD-"); 
			System.log("DRCluster:"+DRCluster);
		}
	}
	else if(tenant == "ISP"){
		if(Hostname.indexOf("-PP") > -1){
			var DRHostname	= Hostname;
			DRHostname = DRHostname.split("-PP").join("-SD");	 		
			System.log("DRHostname:"+DRHostname);
		}
		//TODO: Add any ISP naming convention exceptions
		if(Cluster.indexOf("-PP-") > -1){
			var DRCluster 	= Cluster;
			DRCluster = DRCluster.split("-PP-").join("-SD-"); 		
			System.log("DRCluster:"+DRCluster);
		}
		else {
			var DRCluster 	= Cluster;
		}									
	}	
	
		//Get Nodes of cluster
		var selectQuery = "SELECT F.Id FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id WHERE C.Name = '"+Cluster+"';";										
		var res = cmdb.readCustomQuery(selectQuery);
		if(res){		
			for(var x in res){
				Nodes[x]	= res[x].getProperty("Id");							
			}	
		}	
		
		var selectQuery = "SELECT F.Id FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id WHERE C.Name = '"+DRCluster+"';";										
		var res = cmdb.readCustomQuery(selectQuery);
		if(res){		
			for(var x in res){
				DRNodes[x]	= res[x].getProperty("Id");							
			}	
		}
		
		//Get Nodes to be unmapped --> Implies that DR node comes after Prod Node always.				
		var selectQuery = "SELECT F.Id, F.Name as Hostname, F.Serial FROM FarmObject as F JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id WHERE S.Name='"+tenant+"' AND (F.Name = '"+Hostname+"' OR F.Name = '"+DRHostname+"');";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length > 0){		
			for(var x in res){		
				var server			= new Object();
				server.ForeignBank	= tenant;
				server.FarmObjectId	= res[x].getProperty("Id");
				server.Hostname		= res[x].getProperty("Hostname");
				server.Serial		= res[x].getProperty("Serial");
				Server_Data.push(server);
			}
		}	
		
	if(Cluster == "STANDALONE"){ //Remove Lun using Lun_Delete array and we can use Server_Data[] array since it is a single node	
		if(!RemoveAll) { //Remove a single LUN from one server by filtering UidSerial in Production and LunScsi and Size in DR.		
			var selectQuery = "SELECT Id, LunScsiId, Size FROM Lun WHERE FarmObjectId="+Server_Data[0].FarmObjectId+" AND UidSerial='"+UIDSerial+"';";	
			System.log("selectQuery:"+selectQuery);
				
			var res = cmdb.readCustomQuery(selectQuery);
			if(res){		
				for(var x in res){
					var lun 		= new Object();	
					lun.ForeignBank	= tenant;			
					lun.Hostname	= Server_Data[0].Hostname;
					lun.Serial		= Server_Data[0].Serial;
					lun.ScsiId		= res[x].getProperty("LunScsiId");
					lun.UidSerial	= UIDSerial; 								
					lun.Size 		= res[x].getProperty("Size");
					lun.LunId		= res[x].getProperty("Id");
					lun.FarmObjectId= Server_Data[0].FarmObjectId;
					Lun_Delete.push(lun);												
				}
			}
			var selectQuery = "SELECT Id, UidSerial FROM Lun WHERE FarmObjectId="+Server_Data[1].FarmObjectId+" AND LunScsiId="+Lun_Delete[0].ScsiId+" AND Size="+Lun_Delete[0].Size+";";	
			System.log("lunQuery:"+selectQuery);				
			var res = cmdb.readCustomQuery(selectQuery);
			if(res){
				for(var j in res){
					var lun = new Object();	
					lun.ForeignBank	= tenant;			
					lun.Hostname	= Server_Data[1].Hostname;
					lun.Serial		= Server_Data[1].Serial; 
					lun.ScsiId		= Lun_Delete[0].ScsiId;
					lun.UidSerial	= res[j].getProperty("UidSerial"); 								
					lun.Size 		= Lun_Delete[0].Size;
					lun.LunId		= res[j].getProperty("Id");
					lun.FarmObjectId= Server_Data[1].FarmObjectId;
					Lun_Delete.push(lun);
				}
			}																																														
		}
		else if (RemoveAll) {		
			//Get LUN Data for operator			
			var selectQuery = "SELECT Id, LunScsiId, Size, UidSerial FROM Lun WHERE FarmObjectId = "+Server_Data[0].FarmObjectId+";";	
			System.log("selectQuery:"+selectQuery);
				
			var res = cmdb.readCustomQuery(selectQuery);
			if(res){		
				for(var x in res){
					var lun = new Object();
					lun.ForeignBank	= tenant;
					lun.Hostname	= Server_Data[0].Hostname;
					lun.Serial		= Server_Data[0].Serial;
					lun.ScsiId		= res[x].getProperty("LunScsiId");
					lun.UidSerial	= res[x].getProperty("UidSerial");								
					lun.Size 		= res[x].getProperty("Size");
					lun.LunId		= res[x].getProperty("Id");
					lun.FarmObjectId= Server_Data[0].FarmObjectId;
					Lun_Delete.push(lun);
				}		
			}	
	
			var selectQuery = "SELECT Id, LunScsiId, Size, UidSerial FROM Lun WHERE FarmObjectId = "+Server_Data[1].FarmObjectId+";";	
			System.log("selectQuery:"+selectQuery);
				
			var res = cmdb.readCustomQuery(selectQuery);
			if(res){		
				for(var x in res){
					var lun = new Object();
					lun.ForeignBank	= tenant;
					lun.Hostname	= Server_Data[1].Hostname;
					lun.Serial		= Server_Data[1].Serial;
					lun.ScsiId		= res[x].getProperty("LunScsiId");
					lun.UidSerial	= res[x].getProperty("UidSerial");								
					lun.Size 		= res[x].getProperty("Size");
					lun.LunId		= res[x].getProperty("Id");
					lun.FarmObjectId= Server_Data[1].FarmObjectId;
					Lun_Delete.push(lun);
				}		
			}									
		}
	}
	else if (Cluster != "STANDALONE") {				
		if(Nodes.length > 1) { // Fai solo Unmap della LUN visto che essistono più nodi
			if(!RemoveAll) {		
				//Use Nodes[0] as this contains the primary node of cluster which should be contained in the LUN table.
				var selectQuery = "SELECT Id, LunScsiId, Size FROM Lun WHERE FarmObjectId="+Nodes[0]+" AND UidSerial='"+UIDSerial+"' AND IsBootLun='false';";	
				System.log("selectQuery:"+selectQuery);
			
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var map 		= new Object();		
						map.ForeignBank	= tenant;				
						map.Hostname	= Server_Data[0].Hostname;
						map.Serial		= Server_Data[0].Serial;
						map.ScsiId		= res[x].getProperty("LunScsiId");
						map.UidSerial	= UIDSerial; 								
						map.Size 		= res[x].getProperty("Size");
						map.LunId		= res[x].getProperty("Id");
						map.FarmObjectId= Server_Data[0].FarmObjectId;				
						Lun_UnMap.push(map);
					}
				}
				//If boot LUN then we know that the LUN is contained in the LUN table regardless of node cluster, we can delete this LUN.
				var selectQuery = "SELECT Id, LunScsiId, Size FROM Lun WHERE FarmObjectId="+Server_Data[0].FarmObjectId+" AND UidSerial='"+UIDSerial+"' AND L.IsBootLun='true';";	
				System.log("selectQuery:"+selectQuery);
			
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 		= new Object();		
						lun.ForeignBank	= tenant;				
						lun.Hostname	= Server_Data[0].Hostname;
						lun.Serial		= Server_Data[0].Serial;
						lun.ScsiId		= res[x].getProperty("LunScsiId");
						lun.UidSerial	= UIDSerial; 								
						lun.Size 		= res[x].getProperty("Size");
						lun.LunId		= res[x].getProperty("Id");
						lun.FarmObjectId= Server_Data[0].FarmObjectId;					
						Lun_Delete.push(lun);
					}
				}							
			}																																																						
			else if (RemoveAll) {								
				var selectQuery = "SELECT Id, LunScsiId, UidSerial, Size FROM Lun WHERE FarmObjectId="+Nodes[0]+" AND IsBootLun='false';";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var map 		= new Object();		
						map.ForeignBank	= tenant;				
						map.Hostname	= Server_Data[0].Hostname;
						map.Serial		= Server_Data[0].Serial;
						map.ScsiId		= res[x].getProperty("LunScsiId");
						map.UidSerial	= res[x].getProperty("UidSerial"); 								
						map.Size 		= res[x].getProperty("Size");
						map.LunId		= res[x].getProperty("Id");
						map.FarmObjectId= Server_Data[0].FarmObjectId;					
						Lun_UnMap.push(map);
					}		
				}	
					
				var selectQuery = "SELECT Id, LunScsiId, UidSerial, Size FROM Lun WHERE FarmObjectId="+Server_Data[0].FarmObjectId+" AND IsBootLun='true';";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 		= new Object();		
						lun.ForeignBank	= tenant;				
						lun.Hostname	= Server_Data[0].Hostname;
						lun.Serial		= Server_Data[0].Serial;
						lun.ScsiId		= res[x].getProperty("LunScsiId");
						lun.UidSerial	= res[x].getProperty("UidSerial"); 								
						lun.Size 		= res[x].getProperty("Size");
						lun.LunId		= res[x].getProperty("Id");
						lun.FarmObjectId= Server_Data[0].FarmObjectId;						
						Lun_Delete.push(lun);
					}		
				}								
			}
		}
		else if(Nodes.length == 1) {  //Unico nodo eliminare la LUN
			if(!RemoveAll) {
				var selectQuery = "SELECT Id, LunScsiId, Size FROM Lun WHERE FarmObjectId="+Server_Data[0].FarmObjectId+" AND UidSerial='"+UIDSerial+"';";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 		= new Object();		
						lun.ForeignBank	= tenant;				
						lun.Hostname	= Server_Data[0].Hostname;
						lun.Serial		= Server_Data[0].Serial;
						lun.ScsiId		= res[x].getProperty("LunScsiId");
						lun.UidSerial	= UIDSerial; 								
						lun.Size 		= res[x].getProperty("Size");
						lun.LunId		= res[x].getProperty("Id");
						lun.FarmObjectId= Server_Data[0].FarmObjectId;				
						Lun_Delete.push(lun);
					}		
				}																																																			
			}
			else if (RemoveAll) {									
				var selectQuery = "SELECT Id, LunScsiId, UidSerial, Size FROM Lun WHERE FarmObjectId="+Server_Data[0].FarmObjectId+";";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 					= new Object();		
						lun.ForeignBank	= tenant;				
						lun.Hostname	= Server_Data[0].Hostname;
						lun.Serial		= Server_Data[0].Serial;
						lun.ScsiId		= res[x].getProperty("LunScsiId");
						lun.UidSerial	= res[x].getProperty("UidSerial");								
						lun.Size 		= res[x].getProperty("Size");
						lun.LunId		= res[x].getProperty("Id");
						lun.FarmObjectId= Server_Data[0].FarmObjectId;					
						Lun_Delete.push(lun);
					}		
				}					
			}	
		}
		if(DRNodes.length > 1) { // Facciamo Unmap della LUN relativo al server in DR. Se ci sono più nodi in DR sicuramente ci sono più nodi in produzione quindi i dati LUN sono contenuti nel array Lun_UnMap.	
			if(!RemoveAll) {
				var selectQuery = "SELECT Id, UIDSerial FROM Lun WHERE FarmObjectId="+DRNodes[0]+" AND LunScsiId="+Lun_UnMap[0].ScsiId+" AND Size="+Lun_UnMap[0].Size+" AND IsBootLun='false';";	
				System.log("selectQuery:"+selectQuery);

				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var map 		= new Object();		
						map.ForeignBank	= tenant;				
						map.Hostname	= Server_Data[1].Hostname;
						map.Serial		= Server_Data[1].Serial;
						map.ScsiId		= Lun_UnMap[0].ScsiId;
						map.UidSerial	= res[x].getProperty("UIDSerial");								
						map.Size 		= Lun_UnMap[0].Size;
						map.LunId		= res[x].getProperty("Id");
						map.FarmObjectId= Server_Data[1].FarmObjectId;					
						Lun_UnMap.push(map);
					}		
				}
					
				var selectQuery = "SELECT Id, UIDSerial FROM Lun WHERE FarmObjectId="+Server_Data[1].FarmObjectId+" AND LunScsiId="+Lun_Delete[0].ScsiId+" AND Size ="+Lun_Delete[0].Size+" AND IsBootLun='true';";	
				System.log("selectQuery:"+selectQuery);

				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 			= new Object();		
						lun.ForeignBank		= tenant;				
						lun.Hostname		= Server_Data[1].Hostname;
						lun.Serial			= Server_Data[1].Serial;
						lun.ScsiId			= Lun_Delete[0].ScsiId;
						lun.UidSerial		= res[x].getProperty("UIDSerial");								
						lun.Size 			= Lun_Delete[0].Size;
						lun.LunId			= res[x].getProperty("Id");
						lun.FarmObjectId	= Server_Data[1].FarmObjectId;						
						Lun_Delete.push(lun);
					}		
				}																																																																										}																							
			else if (RemoveAll) {								
				var selectQuery = "SELECT Id, LunScsiId, UidSerial, Size FROM Lun WHERE FarmObjectId = "+DRNodes[0]+" AND IsBootLun='false';";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var map 			= new Object();		
						map.ForeignBank		= tenant;				
						map.Hostname		= Server_Data[1].Hostname;
						map.Serial			= Server_Data[1].Serial;
						map.ScsiId			= res[x].getProperty("LunScsiId");
						map.UidSerial		= res[x].getProperty("UIDSerial");								
						map.Size 			= res[x].getProperty("Size");
						map.LunId			= res[x].getProperty("Id");
						map.FarmObjectId	= Server_Data[1].FarmObjectId;					
						Lun_UnMap.push(map);
					}		
				}
				
				var selectQuery = "SELECT Id, LunScsiId, UidSerial, Size FROM Lun WHERE FarmObjectId = "+Server_Data[1].FarmObjectId+" AND IsBootLun='true';";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 		= new Object();		
						lun.ForeignBank	= tenant;				
						lun.Hostname	= Server_Data[1].Hostname;
						lun.Serial		= Server_Data[1].Serial;
						lun.ScsiId		= res[x].getProperty("LunScsiId");
						lun.UidSerial	= res[x].getProperty("UIDSerial");								
						lun.Size 		= res[x].getProperty("Size");
						lun.LunId		= res[x].getProperty("Id");
						lun.FarmObjectId= Server_Data[1].FarmObjectId;					
						Lun_Delete.push(lun);
					}		
				}														
			}			
		}		
		else if (DRNodes.length == 1){ //If DRNodes length = 1 then we are sure that we can use Server_Data[1] as this will certainly contain DR server and we will use Lun_Delete array always.
			if(!RemoveAll) {
				if(Lun_Delete[0].ScsiId && Lun_Delete[0].Size){//If this is a boot LUN or the last node of a cluster both in Production and DR 
																											//then the information regarding the LUN will be in the Lun_Delete array.
					var selectQuery = "SELECT Id, UIDSerial FROM Lun WHERE FarmObjectId= "+Server_Data[1].FarmObjectId+" AND LunScsiId="+Lun_Delete[0].ScsiId+" AND Size ="+Lun_Delete[0].Size+";";	
					System.log("selectQuery:"+selectQuery);				
						
					var res = cmdb.readCustomQuery(selectQuery);
					if(res){		
						for(var x in res){
							var lun 		= new Object();		
							lun.ForeignBank	= tenant;				
							lun.Hostname	= Server_Data[1].Hostname;
							lun.Serial		= Server_Data[1].Serial;
							lun.ScsiId		= Lun_Delete[0].ScsiId;		
							lun.UidSerial	= res[x].getProperty("UIDSerial");								
							lun.Size 		= Lun_Delete[0].Size;	
							lun.LunId		= res[x].getProperty("Id");
							lun.FarmObjectId= Server_Data[1].FarmObjectId;					
							Lun_Delete.push(lun);
						}		
					}
				}
			//If in production we have multiple nodes then the LUN to remove is most likely a data LUN and its information is stored in the Lun_UnMap array.
				if(Lun_UnMap[0].ScsiId && Lun_UnMap[0].Size){
					var selectQuery = "SELECT Id, UIDSerial FROM Lun WHERE FarmObjectId= "+Server_Data[1].FarmObjectId+" AND LunScsiId="+Lun_UnMap[0].ScsiId+" AND Size ="+Lun_UnMap[0].Size+";";	
					System.log("selectQuery:"+selectQuery);				
						
					var res = cmdb.readCustomQuery(selectQuery);
					if(res){		
						for(var x in res){
							var lun 		= new Object();		
							lun.ForeignBank	= tenant;				
							lun.Hostname	= Server_Data[1].Hostname;
							lun.Serial		= Server_Data[1].Serial;
							lun.ScsiId		= Lun_UnMap[0].ScsiId;
							lun.UidSerial	= res[x].getProperty("UIDSerial");								
							lun.Size 		= Lun_UnMap[0].Size;
							lun.LunId		= res[x].getProperty("Id");
							lun.FarmObjectId= Server_Data[1].FarmObjectId;						
							Lun_Delete.push(lun);
						}		
					}
				}																																																																																																															
			}
			//Only one node in DR therefore we can delete all LUNs
			else if (RemoveAll) {									
				var selectQuery = "SELECT Id, LunScsiId, UidSerial, Size FROM Lun WHERE FarmObjectId="+Server_Data[1].FarmObjectId+";";
				System.log("selectQuery:"+selectQuery);
					
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 			= new Object();		
						lun.ForeignBank		= tenant;				
						lun.Hostname		= Server_Data[1].Hostname;
						lun.Serial			= Server_Data[1].Serial;
						lun.ScsiId			= res[x].getProperty("LunScsiId");
						lun.UidSerial		= res[x].getProperty("UIDSerial");								
						lun.Size 			= res[x].getProperty("Size");
						lun.LunId			= res[x].getProperty("Id");
						lun.FarmObjectId	= Server_Data[1].FarmObjectId;					
						Lun_Delete.push(lun);
					}		
				}						
			}
		}																																					
	}
	var ProjectId = getProjectID("Project", "ProjectCode", ProjectCode);			
	
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

	insRequest(vraRequestId, "0000-00-00", user, user, ProjectId, state, "Storage SAN", tenant); 	
																																										
} catch(ex){
	throw "Remove LUN - User Form Data - ERROR: "+ex;
}

function getID(hostname, serial) {
	
	var selectQuery = "SELECT F.Id FROM FarmObject as F WHERE F.Name ='" + hostname + "' AND Serial = '" + serial + "';";
	
	System.log( "selectQuery >" + selectQuery );
	
	var result = cmdb.readCustomQuery(selectQuery);

	var returnId;
	if(result.length == 1) {
		returnId = result[0].getProperty("Id");
	}
	
	return returnId;
}

function getProjectID(tableName, param, value) {
	
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
