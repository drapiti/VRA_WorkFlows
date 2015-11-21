System.log( "Retire Server - User Form Data" );

try  {	
	user				= __asd_requestedFor;
	user				= user.split("@");
	user				= user[0];
	
	Server_Data			= new Array();	
	UnMap_LUNs			= new Array();	
	Delete_LUNs			= new Array();	
	Port_Data			= new Array();	
	var ReservationId	= new Array();
	var ClusterId 		= new Array();				
	
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
		if(Cluster.indexOf("-PP-") > -1){
			var DRCluster 	= Cluster;
			DRCluster = DRCluster.split("-PP-").join("-SD-"); 		
			System.log("DRCluster:"+DRCluster);
		}
		else {
			var DRCluster 	= Cluster;
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

	insRequest(vraRequestId, "0000-00-00", user, user, ProjectId, state, "Architect", tenant);																																																																																																																																																																																							
																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																			
	
	if(RetireAllNodes && Cluster != "STANDALONE") {
		
		var selectQuery = "SELECT ClusterId FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id WHERE C.Name = '"+Cluster+"' AND F.Name = '"+Hostname+"' AND F.Serial = '"+Serial+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);			
																														
		if(res.length == 1){
			ClusterId[0] = res[0].getProperty("ClusterId"); 
			System.log( "ClusterId[0] >"+ClusterId[0] );					
		}			
		
		var selectQuery = "SELECT ClusterId FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id WHERE C.Name = '"+DRCluster+"' AND S.Name = '"+tenant+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);						
	
		if(res.length == 1){
			ClusterId[1] = res[0].getProperty("ClusterId"); 
			System.log( "ClusterId[1] >"+ClusterId[1] );
		}	
																																								
		var selectQuery = "SELECT Id, Name as Hostname, Serial, ServiceProfile FROM FarmObject WHERE ClusterId ="+ClusterId[0]+";";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);			
		if(res.length > 0){		
			for(var x in res){					
				var server 				= new Object();	
				server.FarmObjectId		= res[x].getProperty("Id");			
				server.ForeignBank		= tenant;	
				server.Hostname			= res[x].getProperty("Hostname");
				server.Serial			= res[x].getProperty("Serial");								
				server.ServiceProfile	= res[x].getProperty("ServiceProfile");					
				Server_Data.push(server);					
			}
		}		
		
		if(ClusterId[1]>0){
				
			var selectQuery = "SELECT Id, Name as Hostname, Serial, ServiceProfile FROM FarmObject WHERE ClusterId ="+ClusterId[1]+";";										
			System.log( "selectQuery >"+selectQuery );
			var res = cmdb.readCustomQuery(selectQuery);			
			if(res.length > 0){		
				for(var x in res){					
					var server 				= new Object();	
					server.FarmObjectId		= res[x].getProperty("Id");			
					server.ForeignBank		= tenant;	
					server.Hostname			= res[x].getProperty("Hostname");
					server.Serial			= res[x].getProperty("Serial");								
					server.ServiceProfile	= res[x].getProperty("ServiceProfile");					
					Server_Data.push(server);					
				}
			}		
		}
		for(var x=0; x<Server_Data.length; x++){	
			// Lun_Data				
			var selectQuery = "SELECT F.Name as Hostname, L.Id, LunLabel, UidSerial, Size FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var luns = cmdb.readCustomQuery(selectQuery);
			if(luns.length > 0){		
				for(var z in luns){				
					var lun 				= new Object();	
					lun.Hostname			= Server_Data[x].Hostname;	
					lun.LunId				= luns[z].getProperty("Id");		
					lun.LunLabel			= luns[z].getProperty("LunLabel");
					lun.UidSerial			= luns[z].getProperty("UidSerial");								
					lun.Size				= luns[z].getProperty("Size");	
					lun.FarmObjectId		= Server_Data[x].FarmObjectId;
					Delete_LUNs.push(lun);				
				}	
				HasStorage = true;	
			}		
			// Port_Data		
			var selectQuery = "SELECT F.Name as Hostname, P.Id, PortNo, P.State, Type, WWPN, MAC FROM Port as P JOIN FarmObject as F ON F.Id=P.FarmObjectId WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var ports = cmdb.readCustomQuery(selectQuery);
			if(ports.length > 0){		
				for(var y in ports){				
					var port 				= new Object();		
					port.Hostname			= ports[y].getProperty("Hostname");
					port.PortId				= ports[y].getProperty("Id");		
					port.PortNo				= ports[y].getProperty("PortNo");
					port.State				= ports[y].getProperty("State");
					port.Type				= ports[y].getProperty("Type");								
					port.WWPN				= ports[y].getProperty("WWPN");	
					port.MAC				= ports[y].getProperty("MAC");
					Port_Data.push(port);				
				}		
			}		
			//Reservation Data
			var selectQuery = "SELECT Id FROM Reservation WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var reservations = cmdb.readCustomQuery(selectQuery);
			if(reservations.length > 0){
				for(var z in reservations){						
					ReservationId[z]		= reservations[z].getProperty("Id");										
				}		
			}																		
		}																																														
	}	
	else if((RetireAllNodes || !RetireAllNodes) && Cluster == "STANDALONE"){
		//Node Data		
		var selectQuery = "SELECT F.Id, ServiceProfile FROM FarmObject as F JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id WHERE F.Name = '"+Hostname+"' AND F.Serial = '"+Serial+"' AND S.Name='"+tenant+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length == 1){						
			var server 				= new Object();	
			server.FarmObjectId		= res[0].getProperty("Id");			
			server.Hostname			= Hostname;
			server.Serial			= Serial;							
			server.ServiceProfile	= res[0].getProperty("ServiceProfile");	
			server.ForeignBank		= tenant;	
			Server_Data.push(server);			
		}
		
		var selectQuery = "SELECT F.Id, Serial, ServiceProfile FROM FarmObject as F JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id WHERE F.Name = '"+DRHostname+"' AND S.Name='"+tenant+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length == 1){						
			var server 				= new Object();	
			server.FarmObjectId		= res[0].getProperty("Id");			
			server.Hostname			= DRHostname;
			server.Serial			= res[0].getProperty("Serial");							
			server.ServiceProfile	= res[0].getProperty("ServiceProfile");	
			server.ForeignBank		= tenant;	
			Server_Data.push(server);			
		}
						
		for(var x=0; x<Server_Data.length; x++) {
		
			var selectQuery = "SELECT F.Name as Hostname, L.Id, LunLabel, UidSerial, Size FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var luns = cmdb.readCustomQuery(selectQuery);				
			if(luns.length > 0){		
				for(var z in luns){											
					var lun 				= new Object();
					lun.Hostname			= Server_Data[x].Hostname;
					lun.LunId				= luns[z].getProperty("Id");										
					lun.LunLabel			= luns[z].getProperty("LunLabel");
					lun.UidSerial			= luns[z].getProperty("UidSerial");								
					lun.Size				= luns[z].getProperty("Size");
					lun.FarmObjectId		= Server_Data[x].FarmObjectId;
					Delete_LUNs.push(lun);																
				}
				HasStorage = true;						
			}
	
			// Port_Data		
			var selectQuery = "SELECT F.Name as Hostname, P.Id, PortNo, P.State, Type, WWPN, MAC FROM Port as P JOIN FarmObject as F ON F.Id=P.FarmObjectId WHERE P.FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var ports = cmdb.readCustomQuery(selectQuery);
			if(ports.length > 0){		
				for(var y in ports){				
					var port 				= new Object();		
					port.Hostname			= ports[y].getProperty("Hostname");
					port.PortId				= ports[y].getProperty("Id");		
					port.PortNo				= ports[y].getProperty("PortNo");
					port.State				= ports[y].getProperty("State");
					port.Type				= ports[y].getProperty("Type");								
					port.WWPN				= ports[y].getProperty("WWPN");	
					port.MAC				= ports[y].getProperty("MAC");
					Port_Data.push(port);				
				}		
			}		
			//Reservation Data
			var selectQuery = "SELECT Id FROM Reservation WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
			System.log( "selectQuery >"+selectQuery );
			var reservations = cmdb.readCustomQuery(selectQuery);
			if(reservations.length > 0){		
				for(var z in reservations){						
					ReservationId[z]		= reservations[z].getProperty("Id");										
				}		
			}												
		}																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																									
	}				
	else if(!RetireAllNodes && Cluster != "STANDALONE"){								
		var ProdActiveNodes 	= new Array();
		var DRActiveNodes		= new Array();
		HasStorage = true;
		
		var UnMapProdNodeIds	= new Array();
		var UnMapDRNodeIds 		= new Array();
		
		//Get Cluster IDs
		var selectQuery = "SELECT C.Id FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id WHERE C.Name = '"+Cluster+"' AND F.Name='"+Hostname+"' AND F.Serial='"+Serial+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
																														
		if(res.length == 1){
			ClusterId[0] = res[0].getProperty("Id"); 
			System.log( "ClusterId[0] >"+ClusterId[0] );
		}						
		
		//Do not use DRHostname instead use DRCluster. Example node2 of a cluster in DR may not exist
		var selectQuery = "SELECT C.Id FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id JOIN ServiceLevel as SL ON F.ServiceLevelId=SL.Id JOIN Service as S ON SL.ServiceId=S.Id WHERE C.Name = '"+DRCluster+"' AND S.Name='"+tenant+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);	
					
		if(res.length == 1){
			ClusterId[1] = res[0].getProperty("Id"); 
			System.log( "ClusterId[1] >"+ClusterId[1] );
		}																																																																								
		
		//Determine Active Nodes
		var selectQuery = "SELECT Id FROM FarmObject WHERE ClusterId = "+ClusterId[0]+" AND State='Active';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length > 0){		
			for(var x in res){					
				ProdActiveNodes[x]		= res[x].getProperty("Id");						
			}
		}
		
		var selectQuery = "SELECT Id FROM FarmObject WHERE ClusterId = "+ClusterId[1]+" AND State='Active';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length > 0){		
			for(var x in res){					
				DRActiveNodes[x]		= res[x].getProperty("Id");						
			}
		}
															
		//Get All Nodes to be retired --> Implies that DR nodes come after Prod Nodes always.				
		var selectQuery = "SELECT Id, Name as Hostname, Serial, ServiceProfile FROM FarmObject WHERE (Name = '"+Hostname+"' AND Serial = '"+Serial+"') OR Name = '"+DRHostname+"';";										
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length > 0){		
			for(var x in res){					
				var server 				= new Object();	
				server.FarmObjectId		= res[x].getProperty("Id");			
				server.ForeignBank		= tenant;	
				server.Hostname			= res[x].getProperty("Hostname");
				server.Serial			= res[x].getProperty("Serial");								
				server.ServiceProfile	= res[x].getProperty("ServiceProfile");					
				Server_Data.push(server);					
			}
		}	
		
		var selectQuery = "SELECT Id FROM FarmObject WHERE ClusterId = "+ClusterId[0]+" AND Id IN (SELECT Id FROM FarmObject WHERE Name = '"+Hostname+"' AND Serial = '"+Serial+"');"						
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length > 0){		
			for(var x in res){	
				UnMapProdNodeIds[x] = res[x].getProperty("Id");	
			}
		}
		
		var selectQuery = "SELECT Id FROM FarmObject WHERE ClusterId = "+ClusterId[1]+" AND Id IN (SELECT Id FROM FarmObject WHERE Name = '"+DRHostname+"');"						
		System.log( "selectQuery >"+selectQuery );
		var res = cmdb.readCustomQuery(selectQuery);
		if(res.length > 0){		
			for(var x in res){	
				UnMapDRNodeIds[x] = res[x].getProperty("Id");	
			}
		}
												
		if(ProdActiveNodes.length > 1 && DRActiveNodes.length == 1 ){ 
			HasStorage = true;	
			//If DrNodes is == 1 then we can delete LUNs in DR site including boot LUN instead of unmapping only				
			//If not DR node unmap only. Get LUNs from ClusterId only 1 copy of the lun is contained in the LUN table. 												
			for(var i=0; i<UnMapProdNodeIds.length; i++){					
				var selectQuery = "SELECT F.Name as Hostname, L.Id, LunLabel, UidSerial, Size FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.ClusterId = '"+ClusterId[0]+"' AND L.IsBootLun='false';";										
				System.log( "selectQuery > "+selectQuery );
				var luns = cmdb.readCustomQuery(selectQuery);				
				if(luns.length > 0){		
					for(var z in luns){											
						var lun 				= new Object();
						lun.Hostname			= Server_Data[0].Hostname;
						lun.LunId				= luns[z].getProperty("Id");										
						lun.LunLabel			= luns[z].getProperty("LunLabel");
						lun.UidSerial			= luns[z].getProperty("UidSerial");								
						lun.Size				= luns[z].getProperty("Size");
						lun.FarmObjectId		= Server_Data[0].FarmObjectId;	
						UnMap_LUNs.push(lun);																
					}																								
				}			
			}	
											
			//All boot LUNs for selected server are deleted
			var selectQuery = "SELECT F.Name as Hostname, L.Id, LunLabel, UidSerial, Size FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE FarmObjectId = "+Server_Data[0].FarmObjectId+" AND IsBootLun='true';";										
			var luns = cmdb.readCustomQuery(selectQuery);				
			if(luns.length > 0){		
				for(var z in luns){											
					var lun 				= new Object();
					lun.Hostname			= Server_Data[0].Hostname;
					lun.LunId				= luns[z].getProperty("Id");										
					lun.LunLabel			= luns[z].getProperty("LunLabel");
					lun.UidSerial			= luns[z].getProperty("UidSerial");								
					lun.Size				= luns[z].getProperty("Size");
					lun.FarmObjectId		= Server_Data[0].FarmObjectId;	
					Delete_LUNs.push(lun);																
				}																			
			}
			
			//Single Node in DR has All LUNs removed only if DRHostname exists and is the only node
			var selectQuery = "SELECT F.Name as Hostname, L.Id, LunLabel, UidSerial, Size FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE FarmObjectId = "+DRActiveNodes[0]+" AND F.Name = '"+DRHostname+"';";										
			System.log( "selectQuery >"+selectQuery );
			var luns = cmdb.readCustomQuery(selectQuery);				
			if(luns.length > 0){		
				for(var z in luns){											
					var lun 				= new Object();
					lun.Hostname			= Server_Data[1].Hostname;
					lun.LunId				= luns[z].getProperty("Id");										
					lun.LunLabel			= luns[z].getProperty("LunLabel");
					lun.UidSerial			= luns[z].getProperty("UidSerial");								
					lun.Size				= luns[z].getProperty("Size");
					lun.FarmObjectId		= Server_Data[1].FarmObjectId;
					Delete_LUNs.push(lun);																
				}																			
			}					
		
			for(var x=0; x<Server_Data.length; x++){									
				// Port_Data		
				var selectQuery = "SELECT F.Name as Hostname, P.Id, PortNo, P.State, Type, WWPN, MAC FROM Port as P JOIN FarmObject as F ON F.Id=P.FarmObjectId WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var ports = cmdb.readCustomQuery(selectQuery);
				if(ports.length > 0){
					for(var y in ports){				
						var port 				= new Object();		
						port.Hostname			= ports[y].getProperty("Hostname");
						port.PortId				= ports[y].getProperty("Id");		
						port.PortNo				= ports[y].getProperty("PortNo");
						port.State				= ports[y].getProperty("State");
						port.Type				= ports[y].getProperty("Type");								
						port.WWPN				= ports[y].getProperty("WWPN");	
						port.MAC				= ports[y].getProperty("MAC");
						Port_Data.push(port);				
					}		
				}		
				//Reservation Data
				var selectQuery = "SELECT Id FROM Reservation WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var reservations = cmdb.readCustomQuery(selectQuery);
				if(reservations.length > 0){	
					for(var z in reservations){						
						ReservationId[z]		= reservations[z].getProperty("Id");										
					}		
				}																																						
			} //End of for loop																															
		}				
		else if(ProdActiveNodes.length == 1 && DRActiveNodes.length == 1) {		
			HasStorage = true;	
			//If last node of cluster delete all LUNs		
			var selectQuery = "SELECT F.Name as Hostname, L.Id, L.LunLabel, L.UidSerial, L.Size, L.FarmObjectId FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.ClusterId = "+ClusterId[0]+" OR F.ClusterId = "+ClusterId[1]+";";										
			var luns = cmdb.readCustomQuery(selectQuery);				
			if(luns.length > 0){		
				for(var z in luns){											
					var lun 				= new Object();
					lun.Hostname			= luns[z].getProperty("Hostname");
					lun.LunId				= luns[z].getProperty("Id");										
					lun.LunLabel			= luns[z].getProperty("LunLabel");
					lun.UidSerial			= luns[z].getProperty("UidSerial");								
					lun.Size				= luns[z].getProperty("Size");
					lun.FarmObjectId		= luns[z].getProperty("FarmObjectId");
					Delete_LUNs.push(lun);																
				}																			
			}	
			for(var x=0; x<Server_Data.length; x++){
				// Port_Data		
				var selectQuery = "SELECT F.Name as Hostname, P.Id, PortNo, P.State, Type, WWPN, MAC FROM Port as P JOIN FarmObject as F ON F.Id=P.FarmObjectId WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var ports = cmdb.readCustomQuery(selectQuery);
				if(ports.length > 0){		
					for(var y in ports){				
						var port 				= new Object();		
						port.Hostname			= ports[y].getProperty("Hostname");
						port.PortId				= ports[y].getProperty("Id");		
						port.PortNo				= ports[y].getProperty("PortNo");
						port.State				= ports[y].getProperty("State");
						port.Type				= ports[y].getProperty("Type");								
						port.WWPN				= ports[y].getProperty("WWPN");	
						port.MAC				= ports[y].getProperty("MAC");
						Port_Data.push(port);				
					}		
				}		
				//Reservation Data
				var selectQuery = "SELECT Id FROM Reservation WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var reservations = cmdb.readCustomQuery(selectQuery);
				if(reservations.length > 0){		
					for(var z in reservations){						
						ReservationId[z]		= reservations[z].getProperty("Id");										
					}		
				}	
			}																									
		}	
		else if(ProdActiveNodes.length > 1 && DRActiveNodes.length > 1) {
			for(var x=0; x<Server_Data.length; x++){
				var selectQuery = "SELECT F.Name as Hostname, L.Id, LunLabel, UidSerial, Size FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE  = "+Server_Data[x].FarmObjectId+" AND IsBootLun='true';";										
				var luns = cmdb.readCustomQuery(selectQuery);				
				if(luns.length > 0){		
					for(var z in luns){											
						var lun 				= new Object();
						lun.Hostname			= Server_Data[x].Hostname;	
						lun.LunId				= luns[z].getProperty("Id");										
						lun.LunLabel			= luns[z].getProperty("LunLabel");
						lun.UidSerial			= luns[z].getProperty("UidSerial");								
						lun.Size				= luns[z].getProperty("Size");
						lun.FarmObjectId		= Server_Data[x].FarmObjectId;	
						Delete_LUNs.push(lun);																
					}																			
				}
			}			
			for(var i=0; i<UnMapProdNodeIds.length; i++){					
				var selectQuery = "SELECT F.Name as Hostname, L.Id, LunLabel, UidSerial, Size FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.ClusterId = '"+ClusterId[0]+"' AND L.IsBootLun='false';";									
				var luns = cmdb.readCustomQuery(selectQuery);				
				if(luns.length > 0){		
					for(var z in luns){											
						var lun 				= new Object();
						lun.Hostname			= Server_Data[0].Hostname;
						lun.LunId				= luns[z].getProperty("Id");										
						lun.LunLabel			= luns[z].getProperty("LunLabel");
						lun.UidSerial			= luns[z].getProperty("UidSerial");								
						lun.Size				= luns[z].getProperty("Size");
						lun.FarmObjectId		= Server_Data[0].FarmObjectId;	
						UnMap_LUNs.push(lun);																
					}																			
				}								
			}
			
			for(var i=0; i<UnMapDRNodeIds.length; i++){					
				var selectQuery = "SELECT F.Name as Hostname, L.Id, LunLabel, UidSerial, Size FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.ClusterId = '"+ClusterId[1]+"' AND L.IsBootLun='false';";									
				var luns = cmdb.readCustomQuery(selectQuery);				
				if(luns.length > 0){		
					for(var z in luns){											
						var lun 				= new Object();
						lun.Hostname			= Server_Data[1].Hostname;
						lun.LunId				= luns[z].getProperty("Id");										
						lun.LunLabel			= luns[z].getProperty("LunLabel");
						lun.UidSerial			= luns[z].getProperty("UidSerial");								
						lun.Size				= luns[z].getProperty("Size");
						lun.FarmObjectId		= Server_Data[1].FarmObjectId;	
						UnMap_LUNs.push(lun);																
					}																			
				}								
			}
			
			for(var x=0; x<Server_Data.length; x++){
				// Port_Data		
				var selectQuery = "SELECT F.Name as Hostname, P.Id, PortNo, P.State, Type, WWPN, MAC FROM Port as P JOIN FarmObject as F ON F.Id=P.FarmObjectId WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var ports = cmdb.readCustomQuery(selectQuery);
				if(ports.length > 0){
					for(var y in ports){				
						var port 				= new Object();		
						port.Hostname			= ports[y].getProperty("Hostname");
						port.PortId				= ports[y].getProperty("Id");		
						port.PortNo				= ports[y].getProperty("PortNo");
						port.State				= ports[y].getProperty("State");
						port.Type				= ports[y].getProperty("Type");								
						port.WWPN				= ports[y].getProperty("WWPN");	
						port.MAC				= ports[y].getProperty("MAC");
						Port_Data.push(port);				
					}		
				}		
				//Reservation Data
				var selectQuery = "SELECT Id FROM Reservation WHERE FarmObjectId = "+Server_Data[x].FarmObjectId+";";										
				var reservations = cmdb.readCustomQuery(selectQuery);
				if(reservations.length > 0){	
					for(var z in reservations){						
						ReservationId[z]		= reservations[z].getProperty("Id");										
					}		
				}	
			}																																																	
		}																								
	}																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																																						
} catch(ex){
	throw "Retire Server - User Form Data - ERROR: "+ex;
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
